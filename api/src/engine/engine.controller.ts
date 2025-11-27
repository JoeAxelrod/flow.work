import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { Pool } from 'pg';
import { EngineService } from './engine.service';

@Controller('api/v1')
export class EngineController {
  constructor(@Inject('PG') private readonly db: Pool, private readonly eng: EngineService) {}

  @Get('instance/:instanceId/activities')
  async list(@Param('instanceId') instanceId:string) {
    const { rows } = await this.db.query(`
      SELECT a.*, s.key as node_key, s.label as node_name
      FROM _activity a JOIN _node s ON s.id=a.node_id
      WHERE a.instance_id=$1 ORDER BY a.created_at ASC`, [instanceId]);
    return rows;
  }

  @Post('instance')
  async createInstance(@Body() body: { workflowId: string; input?: any }) {
    return this.eng.createInstance(body.workflowId, body.input);
  }
}

