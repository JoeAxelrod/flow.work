import { Inject, Injectable, Logger, forwardRef, Optional } from '@nestjs/common';
import { Pool } from 'pg';
import { httpCall } from '../common/http';
import { evaluateFeelExpression } from '../common/feel';
import { RabbitMQService } from './rabbitmq.service';
import { KafkaService } from './kafka.service';
import { EventsGateway } from '../events/events.gateway';

type Edge = { from: string; to: string; type?: 'normal' | 'if'; condition?: string };

@Injectable()
export class EngineService {
  private readonly log = new Logger(EngineService.name);

  constructor(
    @Inject('PG') private readonly db: Pool,
    private readonly rabbitMQ: RabbitMQService,
    @Inject(forwardRef(() => KafkaService)) private readonly kafka: KafkaService,
    @Optional() private readonly eventsGateway?: EventsGateway
  ) { }

  private evalCond(cond: string, ctx: any): boolean {
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
    const val = leftPath.split('.').reduce((a: any, k) => (a == null ? a : a[k]), ctx);

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

  private async nextFromEdges(nodeRow: any, payload: any, instanceState: any): Promise<string[]> {
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
   * Returns true if the node has 0 or 1 incoming edges, or if all distinct source nodes have completed
   */
  async canProceedToNode(instanceId: string, targetNodeId: string): Promise<boolean> {
    // Get all edges targeting this node
    const { rows: incomingEdges } = await this.db.query(`
      SELECT source_id FROM _edge WHERE target_id = $1
    `, [targetNodeId]);

    // Get distinct source nodes (handle duplicate edges)
    const sourceNodeIds = [...new Set(incomingEdges.map((e: any) => e.source_id))];
    const required = sourceNodeIds.length;

    // If 0 or 1 incoming edge, we can proceed immediately
    if (required <= 1) {
      return true;
    }

    // Count how many distinct source nodes have completed activities for this instance
    const { rows: completedCountRows } = await this.db.query(`
      SELECT COUNT(DISTINCT node_id) as completed_count
      FROM _activity
      WHERE instance_id = $1
        AND node_id = ANY($2::uuid[])
        AND status = 'success'
    `, [instanceId, sourceNodeIds]);

    const completedCount = parseInt(completedCountRows[0]?.completed_count || '0', 10);

    // Only proceed if all distinct source nodes have completed
    const canProceed = completedCount >= required;

    if (!canProceed) {
      this.log.log(
        `Waiting for all prerequisites: targetNodeId=${targetNodeId}, ` +
        `required=${required}, completed=${completedCount}`
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

  private async instanceState(instanceId: string) {
    const { rows } = await this.db.query(
      `SELECT output FROM _activity WHERE instance_id=$1 ORDER BY created_at ASC`, [instanceId]);
    return rows.reduce((acc: any, r: any) => ({ ...acc, ...r.output }), {});
  }

  /**
   * Emits an activity update event via the events gateway
   */
  emitActivityUpdateEvent(
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
    let clientReleased = false;
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
      const nodeData = node.data || {};

      // Get instance state for FEEL context
      const instanceState = await this.instanceState(instanceId);
      
      // Prepare node metadata for context
      const nodeMetadata = {
        id: node.id,
        name: node.label,
        label: node.label,
        kind: node.kind,
      };
      
      // Apply FEEL input expression if present
      let transformedInput = input;
      const inputExpression = nodeData.inputExpression || nodeData.input_expression;
      if (inputExpression && inputExpression.trim()) {
        try {
          // Create context with instance state and current input
          // input: merged object with all instance state + current input (for convenience)
          // currentInput: only the raw input passed to this node execution
          // instanceState: all accumulated outputs from previous nodes
          const feelContext = {
            input: { ...instanceState, ...input },
            instanceState: instanceState,
            currentInput: input,
            node: nodeMetadata
          };
          const feelResult = await evaluateFeelExpression(inputExpression, feelContext);
          if (feelResult !== null) {
            // Merge FEEL result with input, with FEEL result taking precedence
            transformedInput = { ...input, ...feelResult };
          }
        } catch (error: any) {
          this.log.error(`FEEL input expression error for node ${nodeId}: ${error.message}`);
          throw new Error(`FEEL input expression error: ${error.message}`);
        }
      }

      // Create activity with transformed input
      const { rows: activityRows } = await client.query(`
        INSERT INTO _activity(instance_id, workflow_id, node_id, status, input, started_at)
        VALUES ($1, $2, $3, 'running', $4, now())
        RETURNING id, status, input, output, started_at
      `, [instanceId, node.workflow_id, nodeId, JSON.stringify(transformedInput || {})]);

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
            output = await httpCall(nodeData, transformedInput, 15000);
            break;
          case 'hook':
            output = { body: transformedInput };
            break;
          case 'timer':
            const ms = Number(nodeData?.ms ?? 1000);
            const dueAt = Date.now() + ms;
            output = { scheduledFor: dueAt };
            
            // Apply FEEL output expression if present (before storing)
            const timerOutputExpression = nodeData.outputExpression || nodeData.output_expression;
            if (timerOutputExpression && timerOutputExpression.trim()) {
              try {
                const feelContext = {
                  input: transformedInput,
                  output: output,
                  instanceState: instanceState,
                  currentOutput: output,
                  node: nodeMetadata
                };
                const feelResult = await evaluateFeelExpression(timerOutputExpression, feelContext);
                if (feelResult !== null) {
                  output = { ...output, ...feelResult };
                }
              } catch (error: any) {
                this.log.error(`FEEL output expression error for timer node ${nodeId}: ${error.message}`);
                throw new Error(`FEEL output expression error: ${error.message}`);
              }
            }
            
            // Store scheduledFor in output while timer is running
            await client.query(`
              UPDATE _activity SET output=$1, updated_at=now()
              WHERE id=$2
            `, [JSON.stringify(output), activityId]);
            await client.query('COMMIT');
            client.release();
            clientReleased = true;
            // Publish timer and return early - activity stays 'running' until timer fires
            await this.rabbitMQ.publishTimer(ms, {
              instanceId,
              nodeId,
              workflowId: node.workflow_id,
              dueAt,
              activityId, // Important: pass activityId so timer handler can mark it success
            });
            // Emit activity update with output (timer is running)
            this.emitActivityUpdateEvent(
              instanceId,
              activityId,
              nodeId,
              nodeLabel,
              nodeKind,
              'running',
              activityRows[0].input,
              output,
              null,
              startedAt,
              null
            );
            return {
              id: activityId,
              status: 'running',
              input: activityRows[0].input,
              output: output
            };
          case 'join':
            // Join node: pass through input, waits for all incoming edges to complete
            // The canProceedToNode check ensures all prerequisites are met before execution
            output = transformedInput;
            break;
          default:
            output = {};
        }

        // Apply FEEL output expression if present
        const outputExpression = nodeData.outputExpression || nodeData.output_expression;
        if (outputExpression && outputExpression.trim()) {
          try {
            // Create context with instance state, input, and output
            // input: the transformed input used for this node execution
            // output: the raw output from the node execution
            // currentOutput: same as output (for consistency)
            // instanceState: all accumulated outputs from previous nodes
            const feelContext = {
              input: transformedInput,
              output: output,
              instanceState: instanceState,
              currentOutput: output,
              node: nodeMetadata
            };
            const feelResult = await evaluateFeelExpression(outputExpression, feelContext);
            if (feelResult !== null) {
              // Merge FEEL result with output, with FEEL result taking precedence
              output = { ...output, ...feelResult };
            }
            else {
              this.log.warn(`FEEL output expression returned null for node ${nodeId}`);
            }
          } catch (error: any) {
            this.log.error(`FEEL output expression error for node ${nodeId}: ${error.message}`);
            throw new Error(`FEEL output expression error: ${error.message}`);
          }
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
        // Join nodes proceed normally after all incoming edges are satisfied
        if (kind !== 'timer') {
          try {
            const nextNodeIds = await this.findNextNodes(instanceId, nodeId, output);
            if (nextNodeIds.length > 0) {
              // Fetch target kinds once
              const { rows: nextNodeRows } = await this.db.query(
                `SELECT id, kind FROM _node WHERE id = ANY($1::uuid[])`,
                [nextNodeIds]
              );
              const nextKind = new Map<string, string>(nextNodeRows.map((r: any) => [r.id, r.kind]));

              const instanceState = await this.instanceState(instanceId);
              const nextInput = { ...instanceState, ...output };
              
              // Publish to all next nodes, but only gate join targets
              for (const nextNodeId of nextNodeIds) {
                const targetKind = nextKind.get(nextNodeId);

                // 1) Only JOIN targets are gated
                if (targetKind === 'join') {
                  const canProceed = await this.canProceedToNode(instanceId, nextNodeId);
                  if (!canProceed) {
                    this.log.log(`Skipping publish for join node ${nextNodeId} - waiting for all prerequisites to complete`);
                    continue;
                  }
                }

                // 2) Edge conditions only matter when SOURCE is join
                if (kind === 'join') {
                  const edgeConditionMet = await this.checkEdgeCondition(instanceId, nodeId, nextNodeId, { input: nextInput });
                  if (!edgeConditionMet) {
                    this.log.log(`Skipping publish for node ${nextNodeId} - edge condition not met`);
                    continue;
                  }
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
      if (!clientReleased) {
        client.release();
      }
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
