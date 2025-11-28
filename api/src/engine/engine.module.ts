import { Module, forwardRef } from '@nestjs/common';
import { EngineService } from './engine.service';
import { RabbitMQService } from './rabbitmq.service';
import { KafkaService } from './kafka.service';
import { EventsModule } from '../events/events.module';
import { DbModule } from '../db.module';

@Module({
  imports: [DbModule, forwardRef(() => EventsModule)],
  providers: [EngineService, RabbitMQService, KafkaService],
  exports: [EngineService, RabbitMQService, KafkaService],
})
export class EngineModule {}
