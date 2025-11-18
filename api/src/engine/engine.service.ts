import { Inject, Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { httpCall } from '../common/http';
import crypto from 'crypto';
import amqplib from 'amqplib';

type Edge = { from:string; to:string; type?: 'normal'|'if'|'loop'; condition?: string };

@Injectable()
export class EngineService implements OnModuleDestroy {
  private readonly log = new Logger(EngineService.name);

  constructor(@Inject('PG') private readonly db: Pool) {}

  private conn!: any;
  private ch!: any;

  private readonly DELAY_Q = 'timer.delay';
  private readonly FIRED_Q = 'timer.fired';

  async initRabbit() {
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

  private async publishTimer(ms: number, msg: any) {
    await this.ch.sendToQueue(
      this.DELAY_Q,
      Buffer.from(JSON.stringify(msg)),
      { expiration: String(Math.max(0, ms)), persistent: true }
    );
  }

  async onTimerFired(m: { instanceId:string; nodeId:string; workflowId:string; dueAt:number }) {
    // resume from timer node's next edge
    const { rows } = await this.db.query(`SELECT edges, workflow_id, id FROM _node WHERE id=$1`, [m.nodeId]);
    const s = rows[0];
    if (!s) return;
    const nextKey = (s.edges || [])[0]?.to || null;
    if (!nextKey) return;

    const { rows: nx } = await this.db.query(
      `SELECT id FROM _node WHERE workflow_id=$1 AND key=$2`, [s.workflow_id, nextKey]);
    const nextId = nx[0]?.id;
    if (nextId) await this.chain(m.instanceId, nextId, m);
  }

  async runNode(instanceId:string, nodeId:string, payload:any): Promise<string|null> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const { rows: srows } = await client.query(`
        SELECT s.*, w.id as workflow_id
        FROM _node s JOIN _workflow w ON w.id=s.workflow_id WHERE s.id=$1`, [nodeId]);
      if (!srows.length) throw new Error('node not found');
      const s = srows[0];
      const kind = (s.data?.kind) || 'noop';

      const { rows: arows } = await client.query(
        `SELECT * FROM _action WHERE node_id=$1 LIMIT 1`,[s.id]);
      const action = arows[0] || null;

      const { rows: act } = await client.query(`
        INSERT INTO _activity(instance_id,workflow_id,node_id,action_id,status,input,started_at)
        VALUES ($1,$2,$3,$4,'running',$5,now()) RETURNING id
      `,[instanceId, s.workflow_id, s.id, action?.id || null, payload || {}]);
      const activityId = act[0].id;

      let output:any = {};
      try {
        if (kind === 'http') {
          output = await httpCall(action?.config || s.data || {}, payload, action?.timeout_ms || 15000);
        } else if (kind === 'hook') {
          output = { body: payload };
        } else if (kind === 'timer') {
          const ms = Number(s.data?.ms ?? action?.config?.ms ?? 1000);
          const dueAt = Date.now() + ms;
          await this.publishTimer(ms, { instanceId, nodeId, workflowId: s.workflow_id, dueAt });
          output = { scheduledFor: dueAt };
        } else if (kind === 'join') {
          const state = await this.instanceState(instanceId);
          const conds: string[] = (s.data?.conditions || []);
          const ok = conds.every(c => this.evalCond(c, { worflow_activity_state: state }));
          if (!ok) throw new Error('join conditions not met');
          output = { join: 'ok' };
        } else {
          output = {};
        }

        await client.query(
          `UPDATE _activity SET status='success', output=$1, finished_at=now(), updated_at=now() WHERE id=$2`,
          [output, activityId]
        );
        await client.query('COMMIT');

        if (kind === 'timer') return null; // resume via Rabbit consumer

        const nextKey = await this.nextFromEdges(s, output, await this.instanceState(instanceId));
        if (!nextKey) return null;

        const { rows: nx } = await this.db.query(
          `SELECT id FROM _node WHERE workflow_id=$1 AND key=$2`, [s.workflow_id, nextKey]);
        return nx[0]?.id || null;
      } catch (e:any) {
        await client.query(
          `UPDATE _activity SET status='failed', error=$1, finished_at=now(), updated_at=now() WHERE id=$2`,
          [String(e.message||e), activityId]
        );
        await client.query('COMMIT');
        return null;
      }
    } finally { client.release(); }
  }

  async chain(instanceId:string, nodeId:string, initial:any) {
    let cur: string | null = nodeId;
    let payload: any = initial ?? {};
    while (cur) {
      const nextId = await this.runNode(instanceId, cur, payload);
      if (!nextId) break;
      const { rows } = await this.db.query(
        `SELECT output FROM _activity WHERE instance_id=$1 AND node_id=$2 ORDER BY created_at DESC LIMIT 1`,
        [instanceId, cur]
      );
      payload = rows[0]?.output ?? payload;
      cur = nextId;
    }
  }

  newInstance(): string { return crypto.randomUUID(); }
}
