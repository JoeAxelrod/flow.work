import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

type NodeStatus = {
  ok: boolean;
  role?: string;
  state?: string;
  error?: string;
};

let lastTime = 0;

@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(@Inject('PG') private readonly pool: Pool) {}

  onModuleInit() {
    this.checkHealth().catch(err => {
      console.error('[HEALTH] initial check failed:', err);
    });

    this.timer = setInterval(() => {
      this.checkHealth().catch(err => {
        console.error('[HEALTH] periodic check failed:', err);
      });
    }, 10_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async checkHealth() {
    // 1) DB via HAProxy (db)
    let dbOk = false;
    try {
      const res = await this.pool.query('SELECT 1');
      dbOk = res.rowCount === 1;
    } catch (e) {
      console.error('[HEALTH] DB via HAProxy failed:', e);
    }

    // Patroni URLs:
    // when Nest runs on HOST ⇒ use localhost:8008/8009
    // when Nest runs in DOCKER ⇒ set env to http://pg1:8008 / http://pg2:8009
    const pg1Url = process.env.PATRONI_PG1_URL ?? 'http://localhost:8008';
    const pg2Url = process.env.PATRONI_PG2_URL ?? 'http://localhost:8009';

    const pg1 = await this.checkPatroniNode(pg1Url);
    const pg2 = await this.checkPatroniNode(pg2Url);

    // print it ones in 3 minutes
    if (1 || Date.now() - lastTime > 3 * 60 * 1000) {
      console.log('[HEALTH] cluster', { dbOk, pg1, pg2 });
      lastTime = Date.now();
    }
  }

  private async checkPatroniNode(baseUrl: string): Promise<NodeStatus> {
    const url = baseUrl.endsWith('/')
      ? `${baseUrl}health`
      : `${baseUrl}/health`;

    try {
      const res = await fetch(url);
      const body = (await res.json()) as any;

      // Patroni /health returns 200 + JSON with state
      return {
        ok: res.ok && body.state === 'running',
        role: body.role,   // may be undefined, but keep for logging
        state: body.state,
        error: res.ok ? undefined : `status=${res.status}`,
      };
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      return { ok: false, error: msg };
    }
  }

}

