import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { Kafka } from 'kafkajs';
import amqplib from 'amqplib';

type NodeStatus = {
  ok: boolean;
  role?: string;
  state?: string;
  error?: string;
};

@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject('PG_PRIMARY') private readonly primaryPool: Pool,
    @Inject('PG_REPLICA') private readonly replicaPool: Pool,
  ) {}

  onModuleInit() {
    this.checkHealth().catch(err => {
      console.error('[HEALTH] initial check failed:', err);
    });

    this.timer = setInterval(() => {
      this.checkHealth().catch(err => {
        console.error('[HEALTH] periodic check failed:', err);
      });
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async checkHealth() {
    // 1) Simple check on primary (same as before)
    let dbOk = false;
    try {
      const res = await this.primaryPool.query('SELECT 1');
      dbOk = res.rowCount === 1;
    } catch (e) {
      console.error('[HEALTH] DB via primary failed:', e);
    }

    // 2) Patroni node checks (unchanged)
    const pg1Url = process.env.PATRONI_PG1_URL ?? 'http://localhost:8008';
    const pg2Url = process.env.PATRONI_PG2_URL ?? 'http://localhost:8009';

    const pg1 = await this.checkPatroniNode(pg1Url);
    const pg2 = await this.checkPatroniNode(pg2Url);

    // 3) Replication probe: write on primary, read on replica
    const { ok: replicationOk, lagMs, error: replicationError } =
      await this.checkReplicationProbe();

    // 4) Kafka health check
    const kafka = await this.checkKafka();

    // 5) RabbitMQ health check
    const rabbitmq = await this.checkRabbitMQ();

    console.log('[HEALTH] cluster', {
      dbOk,
      pg1,
      pg2,
      replication: {
        ok: replicationOk,
        lagMs,
        error: replicationError,
      },
      kafka,
      rabbitmq,
    });
  }

  private async checkPatroniNode(baseUrl: string): Promise<NodeStatus> {
    const url = baseUrl.endsWith('/') ? `${baseUrl}health` : `${baseUrl}/health`;

    try {
      const res = await fetch(url);
      const body = (await res.json()) as any;

      return {
        ok: res.ok && body.state === 'running',
        role: body.role,
        state: body.state,
        error: res.ok ? undefined : `status=${res.status}`,
      };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      return { ok: false, error: msg };
    }
  }

  // --- new logic below ---

  private async checkReplicationProbe(): Promise<{
    ok: boolean;
    lagMs?: number;
    error?: string;
  }> {
    const id = randomUUID(); // unique per check
    const started = Date.now();

    const insertSql =
      'INSERT INTO _replication_probe (id) VALUES ($1) ON CONFLICT (id) DO NOTHING';
    const deleteSql = 'DELETE FROM _replication_probe WHERE id = $1';
    const selectSql = 'SELECT id FROM _replication_probe WHERE id = $1';

    try {
      // Insert on PRIMARY
      await this.primaryPool.query(insertSql, [id]);

      // Poll REPLICA a few times to allow small replication lag
      const maxAttempts = 5;
      const delayMs = 100;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await this.replicaPool.query(selectSql, [id]);
        if (res.rowCount === 1) {
          const lagMs = Date.now() - started;
          return { ok: true, lagMs };
        }

        // not found yet → small wait then retry
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }

      return {
        ok: false,
        error: 'probe not visible on replica within timeout',
      };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    } finally {
      // Cleanup on PRIMARY (best-effort)
      try {
        await this.primaryPool.query(deleteSql, [id]);
      } catch {
        // ignore cleanup error
      }
    }
  }

  private async checkKafka(): Promise<{ ok: boolean; error?: string }> {
    const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
    const kafka = new Kafka({
      clientId: 'health-check',
      brokers: kafkaBrokers.split(','),
      retry: { retries: 1 },
    });

    const admin = kafka.admin();
    try {
      await admin.connect();
      await admin.listTopics();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    } finally {
      try {
        await admin.disconnect();
      } catch {
        // ignore disconnect error
      }
    }
  }

  private async checkRabbitMQ(): Promise<{ ok: boolean; error?: string }> {
    const rabbitUrl = process.env.RABBIT_URL || 'amqp://localhost';
    let conn: any = null;

    try {
      conn = await amqplib.connect(rabbitUrl);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? String(e) };
    } finally {
      try {
        await conn?.close();
      } catch {
        // ignore close error
      }
    }
  }
}

