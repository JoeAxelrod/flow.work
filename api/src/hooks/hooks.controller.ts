import { Body, Controller, Inject, Param, Post, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { EngineService } from '../engine/engine.service';
import { WorkflowsService } from '../workflows/workflows.service';

@Controller('api/v1/hook/workflow')
export class HooksController {
  constructor(
    @Inject('PG') private readonly db: Pool,
    private readonly eng: EngineService,
    private readonly workflowsService: WorkflowsService
  ) {}

  // specific: /api/v1/hook/workflow/:id/node/:nodeId
  // Note: :id is workflow UUID, :nodeId is node UUID
  @Post(':id/node/:nodeId')
  async nodeHook(@Param('id') workflowId:string, @Param('nodeId') nodeId:string, @Body() body:any) {
    // Verify node exists and belongs to this workflow
    const verifiedId = await this.workflowsService.nodeId(workflowId, nodeId);
    if (!verifiedId) throw new NotFoundException('node not found');
    if (!body?.instanceId) throw new BadRequestException('instanceId required');
    // mark hook as success + proceed along edges (engine handles edge traversal)
    await this.eng.runNode(body.instanceId, verifiedId, body);
    return { ok: true };
  }

  // general: /api/v1/hook/workflow/:id    body: {workflow_node:"<uuid>", instanceId, ...}
  @Post(':id')
  async generalHook(@Param('id') workflowId:string, @Body() body:any) {
    const nodeId = String(body?.worflow_node || body?.workflow_node || '');
    if (!nodeId) throw new BadRequestException('workflow_node required');
    return this.nodeHook(workflowId, nodeId, body);
  }
}

