import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './tests/db-url.js';

export default defineConfig({
  test: {
    environment: 'node',
    // Two suites: Kairos unit tests live next to their source (src/**),
    // the Presence API suite under tests/**.
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    globalSetup: './tests/globalSetup.ts',
    setupFiles: ['./tests/setup.ts'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-not-for-production-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    // Each test uses a distinct school fixture in a dedicated PostgreSQL
    // test database. Sequential files also permit the isolated PGlite QA runtime.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
