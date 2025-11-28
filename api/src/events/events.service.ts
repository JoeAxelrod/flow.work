import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class EventsService {
  constructor(
    @Inject(forwardRef(() => EngineService))
    private engineService: EngineService
  ) {}

  async handleTimerEvent(timerEvent: any) {
    const { workflowId, waitTime } = timerEvent;

    // Continue workflow execution after timer
    console.log(`Timer event received for workflow ${workflowId}, waited ${waitTime}ms`);

    // Resume workflow execution
    return this.engineService.executeWorkflow(workflowId, { timerCompleted: true });
  }

  async handleWebhook(webhookData: any) {
    console.log('Webhook received:', webhookData);

    // Process webhook and potentially trigger workflows
    // This could be extended to match webhooks to specific workflows
  }
}
