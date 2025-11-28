import { Inject, Injectable, Logger, forwardRef, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { httpCall } from '../common/http';
import { RabbitMQService } from './rabbitmq.service';
import { KafkaService } from './kafka.service';
import { EventsGateway } from '../events/events.gateway';

type Edge = { from:string; to:string; type?: 'normal'|'if'|'loop'; condition?: string };

@Injectable()
export class EngineService {
  private readonly log = new Logger(EngineService.name);

  constructor(
    @Inject('PG') private readonly db: Pool,
    private readonly rabbitMQ: RabbitMQService,
    @Inject(forwardRef(() => KafkaService)) private readonly kafka: KafkaService,
    @Optional() private readonly eventsGateway?: EventsGateway
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

  private async nextFromEdges(nodeRow:any, payload:any, instanceState:any): Promise<string[]> {
    const edges: Edge[] = nodeRow.edges || [];
    const nextNodes: string[] = [];
    for (const e of edges) {
      if (e.type === 'if') {
        const ok = this.evalCond(e.condition || '', { activity_metadata: payload, worflow_activity_state: instanceState });
        if (ok) nextNodes.push(e.to);
      } else if (!e.type || e.type === 'normal') {
        nextNodes.push(e.to);
      }
    }
    return nextNodes;
  }

  /**
   * Finds the next nodes to execute based on edges and conditions
   * Returns an array of next node IDs (empty array if no next nodes exist)
   */
  async findNextNodes(instanceId: string, nodeId: string, activityOutput: any = {}): Promise<string[]> {
    // Get the current node with its edges
    const { rows: nodeRows } = await this.db.query(`
      SELECT n.*, w.id as workflow_id
      FROM _node n JOIN _workflow w ON w.id=n.workflow_id 
      WHERE n.id=$1`, [nodeId]);
    
    if (!nodeRows.length) {
      this.log.warn(`Node not found: ${nodeId}`);
      return [];
    }
    
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
    
    // Use the existing nextFromEdges logic to determine next nodes
    const nextNodeIds = await this.nextFromEdges(nodeWithEdges, activityOutput, instanceState);
    if (nextNodeIds.length > 0) {
      this.log.log(`Found ${nextNodeIds.length} next node(s): ${nextNodeIds.join(', ')} for instance: ${instanceId}`);
    } else {
      this.log.log(`No next node found for instance: ${instanceId}, node: ${nodeId}`);
    }
    
    return nextNodeIds;
  }

  private async instanceState(instanceId:string) {
    const { rows } = await this.db.query(
      `SELECT output FROM _activity WHERE instance_id=$1 ORDER BY created_at ASC`,[instanceId]);
    return rows.reduce((acc:any,r:any)=> ({...acc, ...r.output}), {});
  }

  /**
   * Emits an activity update event via the events gateway
   */
  private emitActivityUpdateEvent(
    instanceId: string,
    activityId: string,
    nodeId: string,
    nodeLabel: string,
    nodeKind: string,
    status: 'running' | 'success' | 'failed',
    input: any,
    output: any | null,
    error: string | null,
    startedAt: Date,
    finishedAt: Date | null
  ): void {
    if (this.eventsGateway) {
      this.eventsGateway.emitActivityUpdate(instanceId, {
        id: activityId,
        instanceId,
        nodeId,
        nodeName: nodeLabel,
        nodeKind: nodeKind,
        status,
        input,
        output,
        error,
        startedAt,
        finishedAt,
      });
    }
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

  async executeActivity(instanceId: string, nodeId: string, input: any = {}): Promise<any> {
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
      const nodeLabel = node.label || 'Unknown';
      const nodeKind = node.kind || 'noop';
      
      // Create activity
      const { rows: activityRows } = await client.query(`
        INSERT INTO _activity(instance_id, workflow_id, node_id, status, input, started_at)
        VALUES ($1, $2, $3, 'running', $4, now())
        RETURNING id, status, input, output, started_at
      `, [instanceId, node.workflow_id, nodeId, JSON.stringify(input || {})]);
      
      const activityId = activityRows[0].id;
      const startedAt = activityRows[0].started_at;
      
      // Emit activity started event
      this.emitActivityUpdateEvent(
        instanceId,
        activityId,
        nodeId,
        nodeLabel,
        nodeKind,
        'running',
        activityRows[0].input,
        null,
        null,
        startedAt,
        null
      );
      
      let output: any = {};
      
      try {
        // Execute based on node kind
        switch (kind) {
          case 'http':
            output = await httpCall(node.data || {}, input, 15000);
            break;
          case 'hook':
            output = { body: input };
            break;
          case 'timer':
            const ms = Number(node.data?.ms ?? 1000);
            const dueAt = Date.now() + ms;
            await this.rabbitMQ.publishTimer(ms, { instanceId, nodeId, workflowId: node.workflow_id, dueAt });
            output = { scheduledFor: dueAt };
            break;
          case 'join':
            // For join nodes, we need to wait for all incoming branches
            // Count how many incoming edges lead to this join node
            const { rows: incomingEdges } = await client.query(`
              SELECT COUNT(*) as count
              FROM _edge
              WHERE target_id = $1
            `, [nodeId]);
            
            const requiredBranches = parseInt(incomingEdges[0]?.count || '0', 10);
            
            // Count how many successful activities have already executed for this join node
            const { rows: joinActivities } = await client.query(`
              SELECT COUNT(*) as count
              FROM _activity
              WHERE instance_id = $1 AND node_id = $2 AND status = 'success'
            `, [instanceId, nodeId]);
            
            const completedBranches = parseInt(joinActivities[0]?.count || '0', 10);
            
            this.log.log(
              `Join node reached: instanceId=${instanceId}, nodeId=${nodeId}, ` +
              `completedBranches=${completedBranches}, requiredBranches=${requiredBranches}`
            );
            
            // If this is the first branch reaching the join, or if not all branches have arrived yet,
            // we still mark this activity as success but don't proceed to next nodes
            // The logic to proceed will be handled after the activity is committed
            
            output = { 
              join: 'ok',
              completedBranches: completedBranches + 1, // +1 because we're about to mark this as success
              requiredBranches 
            };
            break;
          default:
            // noop
            output = {};
        }
        
        // Update activity as success
        const { rows: finishedRows } = await client.query(`
          UPDATE _activity 
          SET status='success', output=$1, finished_at=now(), updated_at=now() 
          WHERE id=$2
          RETURNING finished_at
        `, [JSON.stringify(output), activityId]);
        
        const finishedAt = finishedRows[0]?.finished_at;
        
        await client.query('COMMIT');
        
        // Emit activity completed event
        this.emitActivityUpdateEvent(
          instanceId,
          activityId,
          nodeId,
          nodeLabel,
          nodeKind,
          'success',
          activityRows[0].input,
          output,
          null,
          startedAt,
          finishedAt
        );
        
        // Find and publish next nodes to Kafka
        // Skip for timer nodes - they will publish the next node when the timer fires
        // Skip for join nodes until all branches have arrived
        if (kind !== 'timer' && kind !== 'join') {
          try {
            const nextNodeIds = await this.findNextNodes(instanceId, nodeId, output);
            if (nextNodeIds.length > 0) {
              const instanceState = await this.instanceState(instanceId);
              const nextInput = { ...instanceState, ...output };
              // Publish to all next nodes
              for (const nextNodeId of nextNodeIds) {
                await this.kafka.publishActivity(instanceId, nextNodeId, nextInput);
                this.log.log(`Published next activity to Kafka: instanceId=${instanceId}, nextNodeId=${nextNodeId}`);
              }
            } else {
              // No next node found - workflow-instance is complete
              await this.db.query(`
                UPDATE _instance 
                SET status='success', finished_at=now() 
                WHERE id=$1 AND status='running'
              `, [instanceId]);
              this.log.log(`No next node found, marking instance as completed: instanceId=${instanceId}`);
              
              // Emit instance completed event
              if (this.eventsGateway) {
                const { rows: instanceRows } = await this.db.query(`
                  SELECT status, finished_at FROM _instance WHERE id=$1
                `, [instanceId]);
                if (instanceRows.length > 0) {
                  this.eventsGateway.emitInstanceStatusUpdate(instanceId, {
                    instanceId,
                    status: instanceRows[0].status,
                    finishedAt: instanceRows[0].finished_at,
                  });
                }
              }
            }
          } catch (error) {
            // Log error but don't fail the activity execution
            this.log.error(`Failed to publish next node to Kafka: ${String(error)}`, error instanceof Error ? error.stack : undefined);
          }
        } else if (kind === 'join') {
          // For join nodes, check if all branches have arrived before proceeding
          try {
            // Re-check after commit to ensure we have the latest count
            const { rows: joinCheckRows } = await this.db.query(`
              SELECT 
                (SELECT COUNT(*) FROM _edge WHERE target_id = $2) as required_branches,
                (SELECT COUNT(*) FROM _activity WHERE instance_id = $1 AND node_id = $2 AND status = 'success') as completed_branches
            `, [instanceId, nodeId]);
            
            const requiredBranches = parseInt(joinCheckRows[0]?.required_branches || '0', 10);
            const completedBranches = parseInt(joinCheckRows[0]?.completed_branches || '0', 10);
            
            if (requiredBranches === 0) {
              // No incoming edges - treat as regular node and proceed
              this.log.log(`Join node has no incoming edges, proceeding normally: instanceId=${instanceId}, nodeId=${nodeId}`);
              const nextNodeIds = await this.findNextNodes(instanceId, nodeId, output);
              if (nextNodeIds.length > 0) {
                const instanceState = await this.instanceState(instanceId);
                const nextInput = { ...instanceState, ...output };
                for (const nextNodeId of nextNodeIds) {
                  await this.kafka.publishActivity(instanceId, nextNodeId, nextInput);
                  this.log.log(`Published next activity to Kafka: instanceId=${instanceId}, nextNodeId=${nextNodeId}`);
                }
              } else {
                await this.db.query(`
                  UPDATE _instance 
                  SET status='success', finished_at=now() 
                  WHERE id=$1 AND status='running'
                `, [instanceId]);
                this.log.log(`No next node found, marking instance as completed: instanceId=${instanceId}`);
                
                if (this.eventsGateway) {
                  const { rows: instanceRows } = await this.db.query(`
                    SELECT status, finished_at FROM _instance WHERE id=$1
                  `, [instanceId]);
                  if (instanceRows.length > 0) {
                    this.eventsGateway.emitInstanceStatusUpdate(instanceId, {
                      instanceId,
                      status: instanceRows[0].status,
                      finishedAt: instanceRows[0].finished_at,
                    });
                  }
                }
              }
            } else if (completedBranches >= requiredBranches) {
              // All branches have arrived - proceed to next nodes
              this.log.log(
                `All branches arrived at join node: instanceId=${instanceId}, nodeId=${nodeId}, ` +
                `completedBranches=${completedBranches}, requiredBranches=${requiredBranches}`
              );
              
              const nextNodeIds = await this.findNextNodes(instanceId, nodeId, output);
              if (nextNodeIds.length > 0) {
                const instanceState = await this.instanceState(instanceId);
                const nextInput = { ...instanceState, ...output };
                // Publish to all next nodes
                for (const nextNodeId of nextNodeIds) {
                  await this.kafka.publishActivity(instanceId, nextNodeId, nextInput);
                  this.log.log(`Published next activity to Kafka: instanceId=${instanceId}, nextNodeId=${nextNodeId}`);
                }
              } else {
                // No next node found - workflow-instance is complete
                await this.db.query(`
                  UPDATE _instance 
                  SET status='success', finished_at=now() 
                  WHERE id=$1 AND status='running'
                `, [instanceId]);
                this.log.log(`No next node found, marking instance as completed: instanceId=${instanceId}`);
                
                // Emit instance completed event
                if (this.eventsGateway) {
                  const { rows: instanceRows } = await this.db.query(`
                    SELECT status, finished_at FROM _instance WHERE id=$1
                  `, [instanceId]);
                  if (instanceRows.length > 0) {
                    this.eventsGateway.emitInstanceStatusUpdate(instanceId, {
                      instanceId,
                      status: instanceRows[0].status,
                      finishedAt: instanceRows[0].finished_at,
                    });
                  }
                }
              }
            } else {
              // Not all branches have arrived yet - wait
              this.log.log(
                `Join node waiting for more branches: instanceId=${instanceId}, nodeId=${nodeId}, ` +
                `completedBranches=${completedBranches}, requiredBranches=${requiredBranches}`
              );
            }
          } catch (error) {
            // Log error but don't fail the activity execution
            this.log.error(`Failed to check join node status: ${String(error)}`, error instanceof Error ? error.stack : undefined);
          }
        } else {
          this.log.log(`Timer node executed, next node will be published when timer fires: instanceId=${instanceId}, nodeId=${nodeId}`);
        }
        
        return {
          id: activityId,
          status: 'success',
          input: activityRows[0].input,
          output: output
        };
      } catch (e: any) {
        // Update activity as failed
        const { rows: failedRows } = await client.query(`
          UPDATE _activity 
          SET status='failed', error=$1, finished_at=now(), updated_at=now() 
          WHERE id=$2
          RETURNING finished_at
        `, [String(e.message || e), activityId]);
        
        const finishedAt = failedRows[0]?.finished_at;
        await client.query('COMMIT');
        
        // Emit activity failed event
        this.emitActivityUpdateEvent(
          instanceId,
          activityId,
          nodeId,
          nodeLabel,
          nodeKind,
          'failed',
          activityRows[0].input,
          null,
          String(e.message || e),
          startedAt,
          finishedAt
        );
        
        throw e;
      }
    } finally {
      client.release();
    }
  }

  async runNode(instanceId: string, nodeId: string, input: any = {}) {
    await this.executeActivity(instanceId, nodeId, input);
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
    const nextNodeIds = await this.nextFromEdges(nodeWithEdges, input, instanceState);
    // Execute all next activities
    for (const nextNodeId of nextNodeIds) {
      await this.executeActivity(instanceId, nextNodeId, { ...instanceState, ...input });
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
      await this.executeActivity(instance.id, rows[0].id, input);
    }
    return instance;
  }

  async sendTimerEvent(workflowId: string, waitTime: number) {
    await this.rabbitMQ.publishTimer(waitTime, { workflowId, waitTime });
  }
}
