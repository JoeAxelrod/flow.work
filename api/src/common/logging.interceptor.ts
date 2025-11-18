import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    // Log request details
    const body = request.body ? JSON.stringify(request.body).substring(0, 200) : '';
    const params = request.params ? JSON.stringify(request.params) : '{}';
    const query = request.query ? JSON.stringify(request.query) : '{}';
    
    this.logger.log(`[${method}] ${url} - params: ${params}${body ? ` - body: ${body}` : ''}`);

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const responseTime = Date.now() - now;
        this.logger.log(`[${method}] ${url} ${statusCode} - ${responseTime}ms`);
      })
    );
  }
}

