import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../server/package.json', import.meta.url));
const checks = [
  ['Website', process.env.CHECK_WEB_ORIGIN || 'http://localhost:5173', false],
  ['API', `${process.env.CHECK_API_ORIGIN || 'http://localhost:4000'}/api/health`, true],
  ['Intelligence', `${process.env.CHECK_INTELLIGENCE_ORIGIN || 'http://localhost:8010'}/health`, true],
  ['Face engine', `${process.env.CHECK_FACE_ORIGIN || 'http://localhost:8020'}/health`, true],
];
const results = await Promise.all(checks.map(async ([name, url, json]) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = json ? await response.json() : null;
    if (data?.status && data.status !== 'ok') throw new Error(`Health status: ${data.status}`);
    if (name === 'Face engine' && data?.loaded !== true) throw new Error('Face model is not loaded');
    return { name, url, ok: true };
  } catch (error) { return { name, url, ok: false, reason: error.message }; }
}));
// API /health proves the HTTP process is alive; check the school DB separately.
try {
  const config = require('dotenv').parse(readFileSync(new URL('../server/.env', import.meta.url)));
  const connectionString = process.env.DATABASE_URL || config.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  const client = new (require('pg').Client)({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 5000 });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const schema = await client.query(`SELECT extversion,
      to_regclass('public."School"') AS school_table,
      to_regclass('public."KnowledgeItem"') AS knowledge_table
      FROM pg_extension WHERE extname='vector'`);
    if (!schema.rows[0]?.school_table || !schema.rows[0]?.knowledge_table) {
      throw new Error('School schema or pgvector is missing; apply the database setup');
    }
    await client.query('ROLLBACK');
    const address = new URL(connectionString);
    results.push({ name: 'School PostgreSQL + pgvector', url: `${address.hostname}:${address.port || 5432}${address.pathname}`, ok: true });
  } finally { await client.end(); }
} catch (error) { results.push({ name: 'School PostgreSQL + pgvector', url: 'configured school database', ok: false, reason: error.message }); }
try {
  const config = require('dotenv').parse(readFileSync(new URL('../server/.env', import.meta.url)));
  const connectionString = process.env.SQL_LAB_ADMIN_URL || config.SQL_LAB_ADMIN_URL;
  if (!connectionString) throw new Error('SQL_LAB_ADMIN_URL is not configured');
  const client = new (require('pg').Client)({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 5000 });
  try {
    await client.connect();
    const marker = await client.query('SHOW cluster_name');
    const template = await client.query("SELECT 1 FROM pg_database WHERE datname='meridian_lab_template' AND NOT datallowconn");
    if (marker.rows[0].cluster_name !== 'meridian-sql-lab' || template.rowCount !== 1) throw new Error('Dedicated SQL Lab template is not ready');
    const address = new URL(connectionString);
    results.push({ name: 'SQL Lab PostgreSQL', url: `${address.hostname}:${address.port || 5432}`, ok: true });
  } finally { await client.end(); }
} catch (error) { results.push({ name: 'SQL Lab PostgreSQL', url: 'dedicated cluster', ok: false, reason: error.message }); }
for (const result of results) console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.name}: ${result.url}${result.reason ? ` (${result.reason})` : ''}`);
if (results.some(result => !result.ok)) {
  console.error('Start the missing services using README.md. These checks do not verify camera hardware, provider delivery or login credentials.');
  process.exitCode = 1;
}
