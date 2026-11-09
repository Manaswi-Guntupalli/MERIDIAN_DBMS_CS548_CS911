// Run with the administrator URL of the dedicated SQL Lab cluster only.
import 'dotenv/config';
import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
if (!process.env.SQL_LAB_ADMIN_URL) throw new Error('Set SQL_LAB_ADMIN_URL for the dedicated SQL Lab cluster');
const url = new URL(process.env.SQL_LAB_ADMIN_URL);
const db = new pg.Client({connectionString:url.toString()});
await db.connect();
try {
  if ((await db.query('SHOW cluster_name')).rows[0].cluster_name !== 'meridian-sql-lab') throw new Error('Refusing to provision outside the dedicated meridian-sql-lab cluster');
  const existing = await db.query("SELECT 1 FROM pg_database WHERE datname='meridian_lab_template'");
  if (!existing.rowCount) {
    await db.query('CREATE DATABASE meridian_lab_template');
    url.pathname = '/meridian_lab_template';
    const template = new pg.Client({connectionString:url.toString()});
    await template.connect();
    try {
      await template.query('BEGIN');
      for (const name of readdirSync(path.join(root,'server/prisma/migrations')).filter(n=>/^\d/.test(n)).sort())
        await template.query(readFileSync(path.join(root,'server/prisma/migrations',name,'migration.sql'),'utf8'));
      for (const name of ['advanced.sql','integrity.sql']) await template.query(readFileSync(path.join(root,'database',name),'utf8'));
      await template.query(readFileSync(new URL('./seed.sql',import.meta.url),'utf8'));
      await template.query('COMMIT');
    } catch (error) {
      await template.query('ROLLBACK'); await template.end();
      await db.query('DROP DATABASE meridian_lab_template'); throw error;
    } finally { await template.end(); }
    await db.query('REVOKE CONNECT ON DATABASE meridian_lab_template FROM PUBLIC');
    await db.query('ALTER DATABASE meridian_lab_template ALLOW_CONNECTIONS false');
  }
  console.log('Native SQL Lab fictional template is ready. School records were not accessed.');
} finally { await db.end(); }
