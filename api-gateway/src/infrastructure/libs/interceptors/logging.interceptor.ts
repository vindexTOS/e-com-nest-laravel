import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType<string>();
    const startTime = Date.now();

    // Handle GraphQL context
    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const info = gqlContext.getInfo();
      const operationName = info?.fieldName || 'unknown';
      const operationType = info?.parentType?.name || 'Query';

      return next.handle().pipe(
        tap({
          next: () => {
            const responseTime = Date.now() - startTime;
            this.logger.log(
              `GraphQL ${operationType}.${operationName} ${responseTime}ms`,
            );
          },
          error: (error) => {
            const responseTime = Date.now() - startTime;
            this.logger.error(
              `GraphQL ${operationType}.${operationName} ${responseTime}ms - Error: ${error.message}`,
            );
          },
        }),
      );
    }

    // Handle HTTP context
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (!request || !response) {
      return next.handle();
    }

    const { method, url, ip } = request;

    // Skip logging for health checks and docs to reduce noise
    if (url?.includes('/docs') || url?.includes('/health')) {
      return next.handle();
    }

    // Extract user info if authenticated
    const user = (request as any).user;
    const userId = user?.id || user?.email || 'anonymous';

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;
          const logMessage = `${method} ${url} ${statusCode} ${responseTime}ms - IP: ${ip} - User: ${userId}`;

          // Log with appropriate level based on status code
          if (statusCode >= 500) {
            this.logger.error(logMessage);
          } else if (statusCode >= 400) {
            this.logger.warn(logMessage);
          } else {
            this.logger.log(logMessage);
          }
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode || 500;
          const logMessage = `${method} ${url} ${statusCode} ${responseTime}ms - IP: ${ip} - User: ${userId} - Error: ${error.message}`;
          this.logger.error(logMessage);
        },
      }),
    );
  }
}
