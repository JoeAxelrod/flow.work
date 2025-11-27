import { Injectable } from '@nestjs/common';
import { RabbitMQService } from '../engine/rabbitmq.service';

@Injectable()
export class TimeProducerAction {
  constructor(private rabbitMQ: RabbitMQService) {}

  async execute(action: any, context: any) {
    const { waitTime } = action.config;

    // Send timer event via RabbitMQ for durable wait
    await this.rabbitMQ.publishTimer(waitTime, { workflowId: context.workflowId, waitTime });

    return {
      success: true,
      message: `Timer set for ${waitTime}ms`,
      waitTime,
    };
  }
}
