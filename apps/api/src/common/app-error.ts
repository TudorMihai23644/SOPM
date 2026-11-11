import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiError } from '@deadlinehero/shared';

/** Eroare de aplicație cu un cod stabil, pe care interfața îl poate trata. */
export class AppError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, details?: ApiError['details']) {
    super({ code, message, details } satisfies ApiError, status);
  }
}
