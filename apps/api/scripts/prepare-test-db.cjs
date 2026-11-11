// Creează baza de date de test (dacă lipsește) și aplică migrările, înainte de teste.
// Merge la fel pe Windows, macOS și Linux.
const { execSync } = require('node:child_process');
const path = require('node:path');

const url = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/deadlinehero_test';

execSync('npx prisma migrate deploy', {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
