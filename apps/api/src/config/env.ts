import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, { error: 'JWT_ACCESS_SECRET trebuie să aibă cel puțin 32 de caractere' }),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: booleanFromString.optional(),
});

export type Env = z.infer<typeof envSchema> & { COOKIE_SECURE: boolean };

/** Citește și validează variabilele de mediu; aplicația nu pornește dacă lipsește ceva. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Configurație invalidă:\n${problems.join('\n')}`);
  }
  const env = result.data;
  return { ...env, COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production' };
}

export const ENV = Symbol('ENV');
