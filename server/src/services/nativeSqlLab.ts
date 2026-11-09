import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { AppError } from '../lib/errors.js';

const identifier = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";

async function admin() {
  const url = process.env.SQL_LAB_ADMIN_URL;
  if (!url) throw new AppError(503, 'Native SQL Lab is not configured. Set SQL_LAB_ADMIN_URL for its dedicated PostgreSQL cluster.');
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000, query_timeout: 10000 });
  await client.connect();
  try {
    const result = await client.query('SHOW cluster_name');
    if (result.rows[0].cluster_name !== 'meridian-sql-lab') throw new Error('Wrong SQL Lab cluster');
    return client;
  } catch (error) { await client.end(); throw error; }
}

export async function createNativePlayground() {
  const name = 'meridian_lab_' + randomBytes(12).toString('hex');
  const password = randomBytes(24).toString('hex');
  const control = await admin();
  const dispose = async () => {
    const client = await admin();
    try {
      // Only this generated disposable database can be removed. Never accept SQL/user identifiers here.
      if (!/^meridian_lab_[a-f0-9]{24}$/.test(name)) throw new Error('Invalid playground name');
      await client.query(`DROP DATABASE IF EXISTS ${identifier(name)} WITH (FORCE)`);
      await client.query(`DROP ROLE IF EXISTS ${identifier(name)}`);
    } finally { await client.end(); }
  };
  try {
    await control.query(`CREATE ROLE ${identifier(name)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2 PASSWORD ${literal(password)}`);
    await control.query(`ALTER ROLE ${identifier(name)} SET work_mem = '4MB'`);
    await control.query(`ALTER ROLE ${identifier(name)} SET temp_file_limit = '32MB'`);
    await control.query(`ALTER ROLE ${identifier(name)} SET idle_in_transaction_session_timeout = '60s'`);
    await control.query(`CREATE DATABASE ${identifier(name)} WITH TEMPLATE meridian_lab_template OWNER ${identifier(name)}`);
    await control.query(`REVOKE ALL ON DATABASE ${identifier(name)} FROM PUBLIC`);
    const url = new URL(process.env.SQL_LAB_ADMIN_URL!);
    url.pathname = '/' + name;
    const provision = new pg.Client({ connectionString: url.toString() });
    await provision.connect();
    try {
      await provision.query(`ALTER SCHEMA public OWNER TO ${identifier(name)}`);
      // Transfer only non-extension objects in this database. Never REASSIGN OWNED,
      // which can also change ownership of shared databases in the cluster.
      const objects = await provision.query(`SELECT format('ALTER %s %I.%I OWNER TO %I',
        CASE c.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,
        n.nspname,c.relname,$1::text) AS command FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relkind IN ('r','p','S','v','m')
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
        ORDER BY c.relkind='S'`, [name]);
      for (const row of objects.rows) await provision.query(row.command);
      const routines = await provision.query(`SELECT format('ALTER ROUTINE %s OWNER TO %I',p.oid::regprocedure,$1::text) AS command
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')`, [name]);
      for (const row of routines.rows) await provision.query(row.command);
      await provision.query(`GRANT meridian_knowledge TO ${identifier(name)}`);
    } finally { await provision.end(); }
    url.username = name; url.password = password;
    return { url: url.toString(), dispose };
  } catch (error) { await dispose(); throw error; }
  finally { await control.end(); }
}
