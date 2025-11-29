import { Module } from '@nestjs/common';
import { DbModule } from '../db.module';
import { HealthService } from './health.service';

@Module({
  imports: [DbModule],
  providers: [HealthService],
})
export class HealthModule {}

