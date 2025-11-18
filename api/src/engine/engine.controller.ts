import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { Pool } from 'pg';
import { EngineService } from './engine.service';

@Controller('api/v1')
export class EngineController {
  constructor(@Inject('PG') private readonly db: Pool, private readonly eng: EngineService) {}

  @Get('instances/:instanceId/activities')
  async list(@Param('instanceId') instanceId:string) {
    const { rows } = await this.db.query(`
      SELECT a.*, s.key as node_key, s.label as node_name
      FROM _activity a JOIN _node s ON s.id=a.node_id
      WHERE a.instance_id=$1 ORDER BY a.created_at ASC`, [instanceId]);
    return rows;
  }

  // internal callback from timer-worker (deprecated - now handled by RabbitMQ consumer)
  // @Post('internal/timer-fired')
  // async timerFired(@Body() b:any) {
  //   const { instanceId, stationId } = b;
  //   const { rows } = await this.db.query(`SELECT edges, workflow_id FROM station WHERE id=$1`, [stationId]);
  //   const edges = rows[0]?.edges || [];
  //   const nextKey = edges[0]?.to || null; // first edge out of timer
  //   if (!nextKey) return { ok: true };
  //   const { rows: nx } = await this.db.query(`SELECT id FROM station WHERE workflow_id=$1 AND key=$2`,[rows[0].workflow_id, nextKey]);
  //   if (nx[0]?.id) await this.eng.chain(instanceId, nx[0].id, b);
  //   return { ok: true };
  // }
}

