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

  private async onTimerFired(m: { instanceId:string; nodeId:string; workflowId:string; dueAt:number }) {
    try {
      // Get instance state for input
      const { rows: activityRows } = await this.db.query(
        `SELECT output FROM _activity WHERE instance_id=$1 ORDER BY created_at ASC`,
        [m.instanceId]
      );
      const instanceState = activityRows.reduce((acc: any, r: any) => ({ ...acc, ...r.output }), {});
      
      // Use EngineService's findNextNode to properly handle conditional edges
      const nextNodeId = await this.engineService.findNextNode(m.instanceId, m.nodeId, instanceState);
      
      if (nextNodeId) {
        // Publish next activity to Kafka
        await this.kafka.publishActivity(m.instanceId, nextNodeId, instanceState);
        this.log.log(`Timer fired: Published next activity to Kafka: instanceId=${m.instanceId}, nextNodeId=${nextNodeId}`);
      } else {
        // No next node found - workflow is complete
        await this.db.query(`
          UPDATE _instance 
          SET status='success', finished_at=now() 
          WHERE id=$1 AND status='running'
        `, [m.instanceId]);
        this.log.log(`Timer fired but no next node found, marking instance as completed: instanceId=${m.instanceId}, nodeId=${m.nodeId}`);
      }
    } catch (error) {
      this.log.error(`Failed to process timer event: ${String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }
}

