import { Module } from '@nestjs/common';
import { DbModule } from './db.module';
import { EngineService } from './engine/engine.service';
import { EngineController } from './engine/engine.controller';
import { WorkflowsController } from './workflows/workflows.controller';
import { WorkflowsService } from './workflows/workflows.service';
import { HooksController } from './hooks/hooks.controller';

@Module({
  imports: [DbModule],
  controllers: [EngineController, WorkflowsController, HooksController],
  providers: [EngineService, WorkflowsService]
})
export class AppModule {}
