import { Injectable } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class HttpActionExecutor {
  constructor(private engineService: EngineService) {}

  async execute(action: any, context: any) {
    const { url, method = 'GET', headers = {}, body } = action.config;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
