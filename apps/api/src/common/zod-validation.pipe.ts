import { HttpStatus, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { AppError } from './app-error';

/** Validează corpul cererii cu o schemă zod din pachetul comun. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const details = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    throw new AppError(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details[0]?.message ?? 'Date invalide', details);
  }
}
