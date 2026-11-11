import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import type { ApiError } from '@deadlinehero/shared';

const DEFAULT_CODES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

/** Aduce toate erorile la forma { code, message } din specificații. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ThrottlerException) {
      response
        .status(HttpStatus.TOO_MANY_REQUESTS)
        .json({ code: 'TOO_MANY_REQUESTS', message: 'Prea multe cereri. Încercați din nou peste un minut.' } satisfies ApiError);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        response.status(status).json(body);
        return;
      }
      const message = typeof body === 'string' ? body : (body as { message?: string | string[] }).message;
      response.status(status).json({
        code: DEFAULT_CODES[status] ?? 'ERROR',
        message: Array.isArray(message) ? message.join('; ') : (message ?? exception.message),
      } satisfies ApiError);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ code: 'INTERNAL_ERROR', message: 'A apărut o eroare neașteptată.' } satisfies ApiError);
  }
}
