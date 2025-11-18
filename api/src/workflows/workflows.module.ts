import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { Workflow } from './workflow.entity';
import { EngineModule } from '../engine/engine.module';

@Module({
  imports: [TypeOrmModule.forFeature([Workflow]), EngineModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
