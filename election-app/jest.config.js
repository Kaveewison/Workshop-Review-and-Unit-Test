// Unit tests only: every repository is replaced by a test double, so no database,
// Docker or .env is needed. ts-jest type-checks the tests with tsconfig.test.json.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  setupFilesAfterEnv: ['<rootDir>/test/support/seedFaker.ts'],
  // Every test starts with fresh doubles: jest.spyOn is undone after each test.
  restoreMocks: true,
};
