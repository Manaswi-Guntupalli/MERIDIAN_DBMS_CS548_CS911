// Runs in every worker BEFORE any test module (and therefore before the
// Prisma client singleton) is imported — points the app at the test database.
import { TEST_DATABASE_URL } from '../../tests/db-url.js';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
