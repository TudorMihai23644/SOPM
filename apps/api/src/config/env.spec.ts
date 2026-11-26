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

  it('pe Render, folosește adresa publică a serviciului pentru CORS și linkurile din emailuri', () => {
    const env = loadEnv({ ...base, RENDER_EXTERNAL_URL: 'https://deadlinehero.onrender.com' });
    expect(env.CORS_ORIGIN).toBe('https://deadlinehero.onrender.com');
    expect(env.APP_URL).toBe('https://deadlinehero.onrender.com');

    const custom = loadEnv({ ...base, RENDER_EXTERNAL_URL: 'https://x.onrender.com', APP_URL: 'https://deadlinehero.ro' });
    expect(custom.APP_URL).toBe('https://deadlinehero.ro');
    expect(custom.CORS_ORIGIN).toBe('https://x.onrender.com');
  });

  it('refuză un secret JWT prea scurt', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'scurt' })).toThrow(/JWT_ACCESS_SECRET/);
  });
});
