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

function bodyParserError(exception: unknown): { status: number; body: ApiError } | null {
  if (typeof exception !== 'object' || exception === null) return null;
  const { status, type } = exception as { status?: unknown; type?: unknown };
  if (typeof status !== 'number' || status < 400 || status >= 500 || typeof type !== 'string') return null;
  if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
    return { status, body: { code: 'PAYLOAD_TOO_LARGE', message: 'Cererea este prea mare.' } };
  }
  return { status, body: { code: DEFAULT_CODES[status] ?? 'BAD_REQUEST', message: 'Cererea nu este validă.' } };
}

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

    // Erorile parserului de corp (Express): corp prea mare, JSON invalid etc. Sunt greșeli ale
    // clientului, deci primesc statusul lor (4xx), fără detalii interne.
    const clientError = bodyParserError(exception);
    if (clientError) {
      response.status(clientError.status).json(clientError.body);
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ code: 'INTERNAL_ERROR', message: 'A apărut o eroare neașteptată.' } satisfies ApiError);
  }
}
