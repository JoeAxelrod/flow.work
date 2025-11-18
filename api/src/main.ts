import { config } from 'dotenv';
import { resolve } from 'path';
// Load .env.local for local dev, fallback to .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { EngineService } from './engine/engine.service';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  await app.listen(3001, '0.0.0.0');

  // Initialize RabbitMQ after server starts
  const engine = app.get(EngineService);
  await engine.initRabbit();
}
bootstrap();
