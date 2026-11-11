import { z } from 'zod';

export const DEFAULT_TIMEZONE = 'Europe/Bucharest';

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Adresa de email nu este validă' }));

export const passwordSchema = z
  .string()
  .min(10, { error: 'Parola trebuie să aibă cel puțin 10 caractere' })
  .max(128, { error: 'Parola poate avea cel mult 128 de caractere' });

export const nicknameSchema = z
  .string()
  .trim()
  .min(3, { error: 'Porecla trebuie să aibă cel puțin 3 caractere' })
  .max(20, { error: 'Porecla poate avea cel mult 20 de caractere' })
  .regex(/^[A-Za-z0-9_.-]+$/, { error: 'Porecla poate conține doar litere, cifre și . _ -' });

export const timezoneSchema = z
  .string()
  .refine(isValidTimezone, { error: 'Fusul orar nu este valid' });

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
  timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
});
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterData = z.output<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Introduceți parola' }),
});
export type LoginInput = z.input<typeof loginSchema>;
