import { Inject, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { httpCall } from '../common/http';
import { RabbitMQService } from './rabbitmq.service';

type Edge = { from:string; to:string; type?: 'normal'|'if'|'loop'; condition?: string };

@Injectable()
export class EngineService {
  private readonly log = new Logger(EngineService.name);

  constructor(
    @Inject('PG') private readonly db: Pool,
    private readonly rabbitMQ: RabbitMQService
  ) {}

  private evalCond(cond:string, ctx:any): boolean {
    const m = cond?.match(/^\s*([a-zA-Z0-9_.]+)\s*=\s*(.+)\s*$/);
    if (!m) return false;
    const path = m[1]; const rightRaw = m[2];
    const val = path.split('.').reduce((a:any,k)=> (a==null? a : a[k]), ctx);
    let right:any = rightRaw;
    if (/^\d+(\.\d+)?$/.test(rightRaw)) right = Number(rightRaw);
    else if (/^"(.*)"$/.test(rightRaw)) right = rightRaw.slice(1,-1);
    return val === right;
  }

  private async nextFromEdges(nodeRow:any, payload:any, instanceState:any): Promise<string|null> {
    const edges: Edge[] = nodeRow.edges || [];
    for (const e of edges) {
      if (e.type === 'if') {
        const ok = this.evalCond(e.condition || '', { activity_metadata: payload, worflow_activity_state: instanceState });
        if (ok) return e.to;
      } else if (!e.type || e.type === 'normal') {
        return e.to;
      }
    }
    return null;
  }

  private async instanceState(instanceId:string) {
    const { rows } = await this.db.query(
      `SELECT output FROM _activity WHERE instance_id=$1 ORDER BY created_at ASC`,[instanceId]);
    return rows.reduce((acc:any,r:any)=> ({...acc, ...r.output}), {});
  }


  async createInstance(workflowId: string, input: any = {}): Promise<{ id: string; workflowId: string; status: string; input: any; output: any; startedAt: Date }> {
    // Verify workflow exists
    const { rows: workflowRows } = await this.db.query(
      `SELECT id FROM _workflow WHERE id=$1`,
      [workflowId]
    );
    
    if (workflowRows.length === 0) {
      throw new Error('Workflow not found');
    }

    // Create instance
    const { rows } = await this.db.query(
      `INSERT INTO _instance(workflow_id, status, input)
       VALUES ($1, 'running', $2)
       RETURNING id, workflow_id, status, input, output, started_at`,
      [workflowId, JSON.stringify(input)]
    );

    return {
      id: rows[0].id,
      workflowId: rows[0].workflow_id,
      status: rows[0].status,
      input: rows[0].input,
      output: rows[0].output,
      startedAt: rows[0].started_at
    };
  }

  async createAndRunActivity(instanceId: string, nodeId: string, input: any = {}): Promise<any> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Get node and workflow info
      const { rows: nodeRows } = await client.query(`
        SELECT n.*, w.id as workflow_id
        FROM _node n JOIN _workflow w ON w.id=n.workflow_id 
        WHERE n.id=$1`, [nodeId]);
      
      if (!nodeRows.length) {
        throw new Error('Node not found');
      }
      
      const node = nodeRows[0];
      const kind = node.kind;
      
      // Create activity
      const { rows: activityRows } = await client.query(`
        INSERT INTO _activity(instance_id, workflow_id, node_id, status, input, started_at)
        VALUES ($1, $2, $3, 'running', $4, now())
        RETURNING id, status, input, output
      `, [instanceId, node.workflow_id, nodeId, JSON.stringify(input || {})]);
      
      const activityId = activityRows[0].id;
      let output: any = {};
      
      try {
        // Execute based on node kind
        if (kind === 'http') {
          output = await httpCall(node.data || {}, input, 15000);
        } else if (kind === 'hook') {
          output = { body: input };
        } else if (kind === 'timer') {
          const ms = Number(node.data?.ms ?? 1000);
          const dueAt = Date.now() + ms;
          await this.rabbitMQ.publishTimer(ms, { instanceId, nodeId, workflowId: node.workflow_id, dueAt });
          output = { scheduledFor: dueAt };
        } else if (kind === 'join') {
          const state = await this.instanceState(instanceId);
          const conds: string[] = (node.data?.conditions || []);
          const ok = conds.every(c => this.evalCond(c, { worflow_activity_state: state }));
          if (!ok) throw new Error('join conditions not met');
          output = { join: 'ok' };
        } else {
          // noop
          output = {};
        }
        
        // Update activity as success
        await client.query(`
          UPDATE _activity 
          SET status='success', output=$1, finished_at=now(), updated_at=now() 
          WHERE id=$2
        `, [JSON.stringify(output), activityId]);
        
        await client.query('COMMIT');
        
        return {
          id: activityId,
          status: 'success',
          input: activityRows[0].input,
          output: output
        };
      } catch (e: any) {
        // Update activity as failed
        await client.query(`
          UPDATE _activity 
          SET status='failed', error=$1, finished_at=now(), updated_at=now() 
          WHERE id=$2
        `, [String(e.message || e), activityId]);
        await client.query('COMMIT');
        throw e;
      }
    } finally {
      client.release();
    }
  }

  async runNode(instanceId: string, nodeId: string, input: any = {}) {
    await this.createAndRunActivity(instanceId, nodeId, input);
    // Continue to next node
    const { rows: nodeRows } = await this.db.query(`
      SELECT n.*, w.id as workflow_id
      FROM _node n JOIN _workflow w ON w.id=n.workflow_id 
      WHERE n.id=$1`, [nodeId]);
    if (!nodeRows.length) return;
    const node = nodeRows[0];
    
    // Fetch edges for this node
    const { rows: edgeRows } = await this.db.query(`
      SELECT e.*, n2.id as target_node_id
      FROM _edge e
      JOIN _node n2 ON n2.id = e.target_id
      WHERE e.source_id = $1`, [nodeId]);
    
    const edges = edgeRows.map((e: any) => ({
      from: nodeId,
      to: e.target_node_id,
      type: e.kind === 'if' ? 'if' : 'normal',
      condition: e.condition || undefined
    }));
    
    const nodeWithEdges = { ...node, edges };
    const instanceState = await this.instanceState(instanceId);
    const nextNodeId = await this.nextFromEdges(nodeWithEdges, input, instanceState);
    if (nextNodeId) {
      await this.createAndRunActivity(instanceId, nextNodeId, { ...instanceState, ...input });
    }
  }

  async executeWorkflow(workflowId: string, input: any = {}) {
    const instance = await this.createInstance(workflowId, input);
    const { rows } = await this.db.query(
      `SELECT id FROM _node WHERE workflow_id=$1 AND NOT EXISTS (
        SELECT 1 FROM _edge WHERE target_id=_node.id
      ) LIMIT 1`,
      [workflowId]
    );
    if (rows.length) {
      await this.createAndRunActivity(instance.id, rows[0].id, input);
    }
    return instance;
  }

  async sendTimerEvent(workflowId: string, waitTime: number) {
    await this.rabbitMQ.publishTimer(waitTime, { workflowId, waitTime });
  }
}
