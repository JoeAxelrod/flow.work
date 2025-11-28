import { Inject, Injectable, Logger, forwardRef, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { httpCall } from '../common/http';
import { RabbitMQService } from './rabbitmq.service';
import { KafkaService } from './kafka.service';
import { EventsGateway } from '../events/events.gateway';

type Edge = { from:string; to:string; type?: 'normal'|'if'; condition?: string };

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
    if (!cond || !cond.trim()) return false;
    
    // Support multiple operators: =, <, >, <=, >=, !=, <>
    const operators = ['<=', '>=', '!=', '<>', '<', '>', '='];
    let operator: string | null = null;
    let operatorIndex = -1;
    
    for (const op of operators) {
      const index = cond.indexOf(op);
      if (index !== -1) {
        operator = op;
        operatorIndex = index;
        break;
      }
    }
    
    if (!operator || operatorIndex === -1) return false;
    
    const leftPath = cond.substring(0, operatorIndex).trim();
    const rightRaw = cond.substring(operatorIndex + operator.length).trim();
    
    // Resolve the left side value from context (supports input.something format)
    const val = leftPath.split('.').reduce((a:any, k) => (a == null ? a : a[k]), ctx);
    
    // Parse the right side value
    let right: any = rightRaw;
    if (/^\d+(\.\d+)?$/.test(rightRaw)) {
      right = Number(rightRaw);
    } else if (/^"(.*)"$/.test(rightRaw)) {
      right = rightRaw.slice(1, -1);
    } else if (/^'(.*)'$/.test(rightRaw)) {
      right = rightRaw.slice(1, -1);
    }
    
    // Compare based on operator
    switch (operator) {
      case '=':
        return val == right;
      case '<':
        return Number(val) < Number(right);
      case '>':
        return Number(val) > Number(right);
      case '<=':
        return Number(val) <= Number(right);
      case '>=':
        return Number(val) >= Number(right);
      case '!=':
      case '<>':
        return val !== right;
      default:
        return false;
    }
  }

  private async nextFromEdges(nodeRow:any, payload:any, instanceState:any): Promise<string[]> {
    const edges: Edge[] = nodeRow.edges || [];
    const nextNodes: string[] = [];
    // Merge instance state and current payload to create context with 'input' key
    const context = { input: { ...instanceState, ...payload } };
    for (const e of edges) {
      if (e.type === 'if') {
        const ok = this.evalCond(e.condition || '', context);
        if (ok) nextNodes.push(e.to);
      } else if (!e.type || e.type === 'normal') {
        nextNodes.push(e.to);
      }
    }
    return nextNodes;
  }

  /**
   * Checks if all prerequisite activities have completed for a target node
   * Returns true if the node has 0 or 1 incoming edges, or if all source nodes have completed
   */
  private async canProceedToNode(instanceId: string, targetNodeId: string): Promise<boolean> {
    // Get all edges targeting this node
    const { rows: incomingEdges } = await this.db.query(`
      SELECT source_id FROM _edge WHERE target_id = $1
    `, [targetNodeId]);
    
    const incomingEdgeCount = incomingEdges.length;
    
    // If 0 or 1 incoming edge, we can proceed immediately
    if (incomingEdgeCount <= 1) {
      return true;
    }
    
    // If more than 1 incoming edge, check if all source nodes have completed activities
    const sourceNodeIds = incomingEdges.map((e: any) => e.source_id);
    
    // Count how many distinct source nodes have completed activities for this instance
    const { rows: completedCountRows } = await this.db.query(`
      SELECT COUNT(DISTINCT node_id) as completed_count
      FROM _activity
      WHERE instance_id = $1
        AND node_id = ANY($2::uuid[])
        AND status = 'success'
    `, [instanceId, sourceNodeIds]);
    
    const completedCount = parseInt(completedCountRows[0]?.completed_count || '0', 10);
    
    // Only proceed if all source nodes have completed
    const canProceed = completedCount >= incomingEdgeCount;
    
    if (!canProceed) {
      this.log.log(
        `Waiting for all prerequisites: targetNodeId=${targetNodeId}, ` +
        `incomingEdges=${incomingEdgeCount}, completed=${completedCount}`
      );
    }
    
    return canProceed;
  }

  /**
   * Checks if an edge condition is met for a specific edge between source and target nodes
   */
  private async checkEdgeCondition(instanceId: string, sourceNodeId: string, targetNodeId: string, context: any): Promise<boolean> {
    // Get the edge between source and target
    const { rows: edgeRows } = await this.db.query(`
      SELECT e.*
      FROM _edge e
      WHERE e.source_id = $1 AND e.target_id = $2
      LIMIT 1
    `, [sourceNodeId, targetNodeId]);
    
    if (edgeRows.length === 0) {
      // No edge found, treat as normal edge (always proceed)
      return true;
    }
    
    const edge = edgeRows[0];
    
    // If edge is not conditional, always proceed
    if (edge.kind !== 'if' || !edge.condition) {
      return true;
    }
    
    // Evaluate the condition
    // The context should have 'input' key with the workflow state
    const conditionMet = this.evalCond(edge.condition, context);
    
    if (!conditionMet) {
      this.log.log(
        `Edge condition not met: sourceNodeId=${sourceNodeId}, targetNodeId=${targetNodeId}, ` +
        `condition="${edge.condition}"`
      );
    }
    
    return conditionMet;
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
      const nodeKind = node.kind || 'http';
      
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
          default:
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
        if (kind !== 'timer') {
          try {
            const nextNodeIds = await this.findNextNodes(instanceId, nodeId, output);
            if (nextNodeIds.length > 0) {
              const instanceState = await this.instanceState(instanceId);
              const nextInput = { ...instanceState, ...output };
              // Publish to all next nodes, but only if all prerequisites are met and edge conditions are satisfied
              for (const nextNodeId of nextNodeIds) {
                const canProceed = await this.canProceedToNode(instanceId, nextNodeId);
                if (!canProceed) {
                  this.log.log(`Skipping publish for node ${nextNodeId} - waiting for all prerequisites to complete`);
                  continue;
                }
                
                // Check if the edge has a condition (type "if") that is met
                const edgeConditionMet = await this.checkEdgeCondition(instanceId, nodeId, nextNodeId, { input: nextInput });
                if (!edgeConditionMet) {
                  this.log.log(`Skipping publish for node ${nextNodeId} - edge condition not met`);
                  continue;
                }
                
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
