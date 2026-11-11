// Testele rulează pe o bază de date separată, cu migrările aplicate (prisma migrate deploy).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/deadlinehero_test';
process.env.JWT_ACCESS_SECRET ??= 'secret-de-test-secret-de-test-secret-de-test';
process.env.COOKIE_SECURE = 'false';
