import { Inject, Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import amqplib from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private readonly log = new Logger(RabbitMQService.name);
  private conn!: any;
  private ch!: any;

  private readonly DELAY_Q = 'timer.delay';
  private readonly FIRED_Q = 'timer.fired';

  constructor(@Inject('PG') private readonly db: Pool) {}

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
    // resume from timer node's next edge
    const { rows } = await this.db.query(`SELECT edges, workflow_id, id FROM _node WHERE id=$1`, [m.nodeId]);
    const s = rows[0];
    if (!s) return;
    const nextKey = (s.edges || [])[0]?.to || null;
    if (!nextKey) return;

    const { rows: nx } = await this.db.query(
      `SELECT id FROM _node WHERE workflow_id=$1 AND key=$2`, [s.workflow_id, nextKey]);
    const nextId = nx[0]?.id;
    // if (nextId) await this.chain(m.instanceId, nextId, m);
  }
}

