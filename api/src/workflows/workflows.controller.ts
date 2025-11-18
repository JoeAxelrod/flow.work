import { Body, Controller, Get, Inject, Param, Post, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { WorkflowsService } from './workflows.service';
import { EngineService } from '../engine/engine.service';

@Controller('api/v1/workflows')
export class WorkflowsController {
  constructor(@Inject('PG') private readonly db: Pool,
              private readonly svc: WorkflowsService,
              private readonly eng: EngineService) {}

  // List all workflows
  @Get()
  async list() {
    return this.svc.list();
  }

  // import the JSON you provided (must come before :id routes)
  @Post('import')
  async import(@Body() def:any) { return this.svc.import(def); }

  // Create a new workflow
  @Post()
  async create(@Body() body: { name: string }) {
    return this.svc.create(body.name);
  }

  // get workflow by id
  @Get(':id')
  async getById(@Param('id') id: string) {
    const workflow = await this.svc.getById(id);
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  // start by API: POST /api/v1/workflows/:id  body provides url+data for S1
  @Post(':id')
  async start(@Param('id') id:string, @Body() body:any) {
    // Get first node by created_at order
    const nodeId = await this.svc.firstNodeId(id);
    if (!nodeId) throw new Error('start node not found');
    const instanceId = this.eng.newInstance();
    await this.eng.chain(instanceId, nodeId, body);
    return { instanceId };
  }
}
