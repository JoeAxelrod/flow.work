import { Injectable } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class TimeProducerAction {
  constructor(private engineService: EngineService) {}

  async execute(action: any, context: any) {
    const { waitTime } = action.config;

    // Send timer event to Kafka for durable wait
    await this.engineService.sendTimerEvent(context.workflowId, waitTime);

    return {
      success: true,
      message: `Timer set for ${waitTime}ms`,
      waitTime,
    };
  }
}
