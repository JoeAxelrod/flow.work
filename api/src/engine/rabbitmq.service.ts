import { Inject, Injectable, OnModuleDestroy, Logger, forwardRef } from '@nestjs/common';
import { Pool } from 'pg';
import amqplib from 'amqplib';
import { KafkaService } from './kafka.service';
import { EngineService } from './engine.service';

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private readonly log = new Logger(RabbitMQService.name);
  private conn!: any;
  private ch!: any;

  private readonly DELAY_Q = 'timer.delay';
  private readonly FIRED_Q = 'timer.fired';

  constructor(
    @Inject('PG') private readonly db: Pool,
    @Inject(forwardRef(() => KafkaService)) private readonly kafka: KafkaService,
    @Inject(forwardRef(() => EngineService)) private readonly engineService: EngineService
  ) {}

  async init() {
    const rabbitUrl = process.env.RABBIT_URL || 'amqp://localhost';
    this.log.log(`Connecting to RabbitMQ at ${rabbitUrl}`);
    this.conn = await amqplib.connect(rabbitUrl) as any;
    this.ch = await this.conn.createChannel();
    this.log.log('RabbitMQ connection established');

    // 1) Fired queue (where we consume)
    this.log.log(`Asserting queue: ${this.FIRED_Q}`);
    await this.ch.assertQueue(this.FIRED_Q, { durable: true });
    this.log.log(`Queue ${this.FIRED_Q} ready`);

    // 2) Delay queue: DLX to FIRED_Q
    this.log.log(`Asserting delay queue: ${this.DELAY_Q} with DLX to ${this.FIRED_Q}`);
    await this.ch.assertQueue(this.DELAY_Q, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',               // use default exchange
        'x-dead-letter-routing-key': this.FIRED_Q,  // route to fired queue after TTL
      },
    });
    this.log.log(`Delay queue ${this.DELAY_Q} ready`);

    // 3) Consumer: resume workflow when messages dead-letter to FIRED_Q
    this.log.log(`Starting consumer for queue: ${this.FIRED_Q}`);
    await this.ch.consume(this.FIRED_Q, async (msg: amqplib.ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const m = JSON.parse(msg.content.toString());
        await this.onTimerFired(m);
        this.ch.ack(msg);
      } catch (e) {
        this.log.error(`Timer consume failed: ${String(e)}`);
        this.ch.nack(msg, false, false); // drop (or bind a DLQ if you want)
      }
    });
    this.log.log('RabbitMQ initialization complete');
  }

  async onModuleDestroy() {
    try { await this.ch?.close(); } catch {}
    try { await this.conn?.close(); } catch {}
  }

  async publishTimer(ms: number, msg: any) {
    await this.ch.sendToQueue(
      this.DELAY_Q,
      Buffer.from(JSON.stringify(msg)),
      { expiration: String(Math.max(0, ms)), persistent: true }
    );
  }

  private async onTimerFired(m: { instanceId:string; nodeId:string; workflowId:string; dueAt:number; activityId?:string }) {
    try {
      const activityId = m.activityId;
      if (!activityId) {
        this.log.warn(`Timer fired without activityId: ${JSON.stringify(m)}`);
        return;
      }

      // Mark timer activity as success
      const output = { scheduledFor: m.dueAt, firedAt: Date.now() };
      const { rows: finished } = await this.db.query(`
        UPDATE _activity
        SET status='success', output=$1, finished_at=now(), updated_at=now()
        WHERE id=$2 AND status='running'
        RETURNING started_at, finished_at, input
      `, [JSON.stringify(output), activityId]);

      if (finished.length === 0) {
        // Already processed (idempotent)
        this.log.log(`Timer activity ${activityId} already processed`);
        return;
      }

      // Emit activity success event
      this.engineService.emitActivityUpdateEvent(
        m.instanceId,
        activityId,
        m.nodeId,
        'Timer',
        'timer',
        'success',
        finished[0].input,
        output,
        null,
        finished[0].started_at,
        finished[0].finished_at
      );

      // Get instance state for input
      const { rows: activityRows } = await this.db.query(
        `SELECT output FROM _activity WHERE instance_id=$1 ORDER BY created_at ASC`,
        [m.instanceId]
      );
      const instanceState = activityRows.reduce((acc: any, r: any) => ({ ...acc, ...r.output }), {});
      
      // Use EngineService's findNextNodes to properly handle conditional edges
      const nextNodeIds = await this.engineService.findNextNodes(m.instanceId, m.nodeId, instanceState);
      
      if (nextNodeIds.length > 0) {
        // Fetch target kinds once
        const { rows: nextNodeRows } = await this.db.query(
          `SELECT id, kind FROM _node WHERE id = ANY($1::uuid[])`,
          [nextNodeIds]
        );
        const nextKind = new Map<string, string>(nextNodeRows.map((r: any) => [r.id, r.kind]));

        // Publish next activities to Kafka with same gating logic as executeActivity
        for (const nextNodeId of nextNodeIds) {
          const targetKind = nextKind.get(nextNodeId);

          // Only JOIN targets are gated
          if (targetKind === 'join') {
            const canProceed = await this.engineService.canProceedToNode(m.instanceId, nextNodeId);
            if (!canProceed) {
              this.log.log(`Skipping publish for join node ${nextNodeId} - waiting for all prerequisites to complete`);
              continue;
            }
          }

          await this.kafka.publishActivity(m.instanceId, nextNodeId, instanceState);
        }
        this.log.log(`Timer fired: Published next activity to Kafka: instanceId=${m.instanceId}, nextNodeIds=${nextNodeIds.join(', ')}`);
      } else {
        // No next node found - workflow is complete
        // Get instance state for output
        const { rows: activityRows } = await this.db.query(
          `SELECT output FROM _activity WHERE instance_id=$1 ORDER BY created_at ASC`,
          [m.instanceId]
        );
        const instanceOutput = activityRows.reduce((acc: any, r: any) => ({ ...acc, ...r.output }), {});
        
        await this.db.query(`
          UPDATE _instance 
          SET status='success', finished_at=now(), output=$1
          WHERE id=$2 AND status='running'
        `, [JSON.stringify(instanceOutput), m.instanceId]);
        this.log.log(`Timer fired but no next node found, marking instance as completed: instanceId=${m.instanceId}, nodeId=${m.nodeId}`);

        // Check if this workflow has a parent workflow activity waiting and publish it
        await this.engineService.checkAndPublishParentActivity(m.instanceId);
      }
    } catch (error) {
      this.log.error(`Failed to process timer event: ${String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }
}

