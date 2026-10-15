import { execSync } from 'node:child_process';
import { TEST_DATABASE_URL } from './db-url.js';
export default function globalSetup() {
  // For externally provisioned, isolated test databases (e.g. PGlite QA).
  // db-url.ts still enforces a separate database name ending in _test.
  if (process.env.TEST_SCHEMA_READY === '1') return;
  execSync('npm run db:setup', { env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }, stdio: 'inherit' });
}
