import { Module } from '@nestjs/common';
import { DbModule } from './db.module';
import { EngineService } from './engine/engine.service';
import { RabbitMQService } from './engine/rabbitmq.service';
import { EngineController } from './engine/engine.controller';
import { WorkflowsController } from './workflows/workflows.controller';
import { WorkflowsService } from './workflows/workflows.service';
import { HooksController } from './hooks/hooks.controller';
import { FakeApiController } from './fake-api/fake-api.controller';
import { FakeApiService } from './fake-api/fake-api.service';

@Module({
  imports: [DbModule],
  controllers: [EngineController, WorkflowsController, HooksController, FakeApiController],
  providers: [EngineService, RabbitMQService, WorkflowsService, FakeApiService]
})
export class AppModule {}
