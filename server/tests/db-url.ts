import 'dotenv/config';
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';
if (!TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test');
const dbName = new URL(TEST_DATABASE_URL).pathname.slice(1);
if (!dbName.endsWith('_test')) throw new Error('Refusing tests: database name must end in _test');
if (TEST_DATABASE_URL === process.env.DATABASE_URL) throw new Error('Test and development databases must differ');
