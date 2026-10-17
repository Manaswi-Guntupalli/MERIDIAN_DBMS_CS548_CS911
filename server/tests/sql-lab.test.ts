import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createFixture } from './helpers.js';
import { closeSqlLabs, sqlLab } from '../src/services/sqlLab.js';
import { prisma } from '../src/lib/prisma.js';
import { SQL_EXAMPLES } from '../../client/src/lib/sql-examples.js';

const app = createApp();
let fixture: Awaited<ReturnType<typeof createFixture>>;
let liveStudents: number;
const key = 'unit-lab-primary';
beforeAll(async () => {
  fixture = await createFixture();
  liveStudents = await prisma.student.count({ where: { schoolId: fixture.school.id } });
});
afterAll(() => closeSqlLabs());

describe('Isolated PostgreSQL SQL Lab', () => {
  it('requires an authenticated administrator for schema, SQL, and reset', async () => {
    for (const path of ['/schema', '/execute', '/reset']) {
      const unauth = path === '/schema' ? request(app).get('/api/database/lab' + path) : request(app).post('/api/database/lab' + path).send({ sql: 'SELECT 1' });
      expect((await unauth).status).toBe(401);
      const denied = path === '/schema' ? request(app).get('/api/database/lab' + path) : request(app).post('/api/database/lab' + path).send({ sql: 'SELECT 1' });
      expect((await denied.set('Authorization', `Bearer ${fixture.teacher.token}`)).status).toBe(403);
    }
  });
  it('validates empty and oversized input without creating a database', async () => {
    for (const sql of ['', ' ', null, 1, 'x'.repeat(20001)]) {
      const response = await request(app).post('/api/database/lab/execute').set('Authorization', `Bearer ${fixture.admin.token}`).send({ sql });
      expect(response.status).toBe(400);
    }
  });
  it('loads the actual application schema, foreign keys and pgvector extension', async () => {
    const response = await sqlLab(key, 'schema');
    expect(response.schema.columns.some((c: any) => c.table === 'Student' && c.primary_key)).toBe(true);
    expect(response.schema.relations.some((r: any) => r.table === 'Fee' && r.target_table === 'Student')).toBe(true);
    const query = await sqlLab(key, 'execute', "SELECT extname FROM pg_extension WHERE extname='vector'");
    expect(query.results[0].rows).toEqual([['vector']]);
  });
  it('executes every presentation example, including writes, rollback, functions, triggers and vectors', async () => {
    for (const example of SQL_EXAMPLES) {
      const response = await sqlLab(key, 'execute', example.sql);
      expect(response.ok, example.title).toBe(true);
      expect(response.results.length, example.title).toBeGreaterThan(0);
    }
    const check = await sqlLab(key, 'execute', 'SELECT count(*) FROM "Student"; SELECT note FROM "LabNotes";');
    expect(Number(check.results[0].rows[0][0])).toBe(8);
    expect(check.results[1].rows[0][0]).toBe('The trigger ran.');
  });
  it('keeps separate users isolated and never modifies website records', async () => {
    await sqlLab(key, 'execute', 'DELETE FROM "Payment"; DELETE FROM "Attendance"; DELETE FROM "Fee";');
    const other = await sqlLab('unit-lab-other', 'execute', 'SELECT count(*) FROM "Attendance"; SELECT count(*) FROM "Fee";');
    expect(Number(other.results[0].rows[0][0])).toBe(56);
    expect(Number(other.results[1].rows[0][0])).toBe(8);
    expect(await prisma.student.count({ where: { schoolId: fixture.school.id } })).toBe(liveStudents);
  });
  it('returns PostgreSQL SQLSTATE and positions, then recovers on the next statement', async () => {
    await expect(sqlLab(key, 'execute', 'SELEC 1;')).rejects.toMatchObject({ status: 400, details: { code: '42601' } });
    const result = await sqlLab(key, 'execute', 'SELECT 7 AS recovered;');
    expect(result.results[0].rows).toEqual([[7]]);
  });
  it('supports explicit transactions across requests and rollback', async () => {
    await sqlLab(key, 'execute', 'BEGIN; CREATE TABLE "Ephemeral" (id integer);');
    await sqlLab(key, 'execute', 'INSERT INTO "Ephemeral" VALUES (1);');
    await sqlLab(key, 'execute', 'ROLLBACK;');
    const result = await sqlLab(key, 'execute', `SELECT to_regclass('public."Ephemeral"') AS name;`);
    expect(result.results[0].rows).toEqual([[null]]);
  });
  it('preserves duplicate column names and limits displayed rows and cell lengths', async () => {
    const result = await sqlLab(key, 'execute', "SELECT 1 AS x, 2 AS x; SELECT i FROM generate_series(1,700) i; SELECT repeat('x', 5000);");
    expect(result.results[0].fields.map((f: any) => f.name)).toEqual(['x', 'x']);
    expect(result.results[0].rows).toEqual([[1, 2]]);
    expect(result.results[1].rows.length).toBe(500);
    expect(result.results[1].rowCount).toBe(700);
    expect(result.results[1].truncated).toBe(true);
    expect(result.results[2].rows[0][0]).toContain('[display truncated]');
  });
  it('caps wide results and enforces the shared display budget', async () => {
    const wide = await sqlLab(key, 'execute', 'SELECT ' + Array.from({ length: 110 }, (_, i) => `${i} AS c${i}`).join(',') + ';');
    expect(wide.results[0].fields.length).toBe(100);
    expect(wide.results[0].fieldsTruncated).toBe(true);
    const large = await sqlLab(key, 'execute', "SELECT repeat('x', 4000) FROM generate_series(1,500);");
    expect(large.results[0].truncated).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(large.results))).toBeLessThan(1_020_000);
  });
  it('cannot access host secrets through the PostgreSQL virtual filesystem', async () => {
    await expect(sqlLab(key, 'execute', "SELECT pg_read_file('/etc/passwd');")).rejects.toMatchObject({ status: 400 });
  });
  it('resets schema changes and restores the seed', async () => {
    const result = await sqlLab(key, 'reset');
    expect(result.reset).toBe(true);
    expect(result.schema.columns.some((c: any) => c.table === 'LabNotes')).toBe(false);
    const check = await sqlLab(key, 'execute', 'SELECT count(*) FROM "Fee";');
    expect(Number(check.results[0].rows[0][0])).toBe(8);
  });
  it('kills a slow query, rejects overlapping commands, and starts a fresh usable cluster', async () => {
    const pending = sqlLab(key, 'execute', 'SELECT pg_sleep(20);');
    // Attach the rejection handler before waiting so a timeout cannot be unhandled.
    const timeout = expect(pending).rejects.toMatchObject({ status: 408 });
    await expect(sqlLab(key, 'reset')).rejects.toMatchObject({ status: 409 });
    await timeout;
    const result = await sqlLab(key, 'execute', 'SELECT count(*) FROM "Student";');
    expect(Number(result.results[0].rows[0][0])).toBe(8);
  });
  it('integrates the authenticated API with the private SQL runner', async () => {
    const response = await request(app).post('/api/database/lab/execute').set('Authorization', `Bearer ${fixture.admin.token}`).send({ sql: 'SELECT 42 AS answer;' });
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.results[0].rows).toEqual([[42]]);
  });
});
