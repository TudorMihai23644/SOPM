import type { ZodType } from 'zod';
import { ApiRequestError } from './api';

export type FieldErrors = Record<string, string>;

/** Validare în browser cu aceleași scheme ca serverul; întoarce primul mesaj pentru fiecare câmp. */
export function validate<T>(schema: ZodType<T>, values: unknown): { data?: T; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return { errors };
}

const FIELD_BY_CODE: Record<string, string> = {
  EMAIL_TAKEN: 'email',
  NICKNAME_TAKEN: 'nickname',
  POSTPONE_LIMIT_REACHED: 'deadlineAt',
};

/** Pune eroarea venită de la server lângă câmpul afectat, sau deasupra formularului. */
export function serverErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiRequestError)) return { form: 'A apărut o eroare neașteptată.' };
  const { code, message, details } = error.body;
  if (details?.length) {
    return Object.fromEntries(details.map((detail) => [detail.path || 'form', detail.message]));
  }
  return { [FIELD_BY_CODE[code] ?? 'form']: message };
}
