/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  moduleNameMapper: {
    '^@deadlinehero/shared$': '<rootDir>/../../packages/shared/src',
  },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
};
