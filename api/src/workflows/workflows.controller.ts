import { Body, Controller, Get, Inject, Param, Post, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { WorkflowsService } from './workflows.service';
import { EngineService } from '../engine/engine.service';
import { KafkaService } from '../engine/kafka.service';

@Controller('api/v1/workflows')
export class WorkflowsController {
  constructor(@Inject('PG') private readonly db: Pool,
              private readonly svc: WorkflowsService,
              private readonly eng: EngineService,
              private readonly kafka: KafkaService) {}

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

  // get instances for a workflow
  @Get(':id/instances')
  async getInstances(@Param('id') id: string) {
    return this.svc.getInstances(id);
  }

  // get a single instance by instance ID
  @Get('instances/:instanceId')
  async getInstance(@Param('instanceId') instanceId: string) {
    return this.svc.getInstance(instanceId);
  }

  // start by API: POST /api/v1/workflows/:id  body provides url+data for S1
  @Post(':id')
  async start(@Param('id') id:string, @Body() body:any) {
    // Get first node (node with no incoming edges)
    const nodeId = await this.svc.firstNodeId(id);
    if (!nodeId) throw new Error('start node not found');
    
    // Create instance record in database
    const instance = await this.eng.createInstance(id, body || {});
    
    // Publish activity to Kafka queue
    await this.kafka.publishActivity(instance.id, nodeId, body || {});
    
    return { instanceId: instance.id, message: 'Activity queued for execution' };
  }
}
