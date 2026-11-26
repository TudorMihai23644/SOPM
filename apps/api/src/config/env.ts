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
  /** Adresa aplicației web, pentru linkurile din emailuri (resetare parolă). */
  APP_URL: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: booleanFromString.optional(),
  /** Folderul cu build-ul aplicației web, servit de API în producție (implicit apps/web/dist). */
  WEB_DIST: z.string().optional(),
});

export type Env = z.infer<typeof envSchema> & { COOKIE_SECURE: boolean };

/** Citește și validează variabilele de mediu; aplicația nu pornește dacă lipsește ceva. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Pe Render, adresa publică a serviciului vine în RENDER_EXTERNAL_URL; dacă CORS_ORIGIN și
  // APP_URL nu sunt setate explicit, se folosește ea (aplicația web e servită de pe aceeași adresă).
  const publicUrl = source.RENDER_EXTERNAL_URL;
  const withDefaults = publicUrl
    ? { CORS_ORIGIN: publicUrl, APP_URL: publicUrl, ...source }
    : source;
  const result = envSchema.safeParse(withDefaults);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Configurație invalidă:\n${problems.join('\n')}`);
  }
  const env = result.data;
  return { ...env, COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production' };
}

export const ENV = Symbol('ENV');
