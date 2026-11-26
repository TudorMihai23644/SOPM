import type { ZodType } from 'zod';

/** Validare locală cu aceleași scheme ca serverul; primul mesaj pentru fiecare câmp. */
export function validate<T>(schema: ZodType<T>, values: unknown): { data?: T; errors: Record<string, string> } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: {} };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issue.message;
  }
  return { errors };
}
