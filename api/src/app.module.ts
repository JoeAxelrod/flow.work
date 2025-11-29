import { Module } from '@nestjs/common';
import { DbModule } from './db.module';
import { EngineModule } from './engine/engine.module';
import { EngineController } from './engine/engine.controller';
import { WorkflowsController } from './workflows/workflows.controller';
import { WorkflowsService } from './workflows/workflows.service';
import { HooksController } from './hooks/hooks.controller';
import { FakeApiController } from './fake-api/fake-api.controller';
import { FakeApiService } from './fake-api/fake-api.service';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [DbModule, EngineModule, EventsModule, HealthModule],
  controllers: [EngineController, WorkflowsController, HooksController, FakeApiController],
  providers: [WorkflowsService, FakeApiService]
})
export class AppModule {}
