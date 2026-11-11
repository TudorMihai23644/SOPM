import { loadEnv } from './env';

const base = { DATABASE_URL: 'postgresql://localhost/db', JWT_ACCESS_SECRET: 'x'.repeat(32) };

describe('loadEnv', () => {
  it('aplică valorile implicite', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(900);
    expect(env.COOKIE_SECURE).toBe(false);
  });

  it('cere cookie Secure în producție', () => {
    expect(loadEnv({ ...base, NODE_ENV: 'production' }).COOKIE_SECURE).toBe(true);
  });

  it('refuză un secret JWT prea scurt', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'scurt' })).toThrow(/JWT_ACCESS_SECRET/);
  });
});
