// A disposable PostgreSQL cluster. No website database connection is loaded here.
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const db = await PGlite.create({ extensions: { vector } });
const migrations = path.join(root, 'server/prisma/migrations');
for (const name of readdirSync(migrations).filter(name => /^\d/.test(name)).sort()) {
  await db.exec(readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8'));
}
for (const name of ['advanced.sql', 'integrity.sql']) {
  await db.exec(readFileSync(path.join(root, 'database', name), 'utf8'));
}
await db.exec(readFileSync(new URL('./seed.sql', import.meta.url), 'utf8'));
await db.exec("SET work_mem = '4MB'; SET temp_file_limit = '32MB';");

async function schema() {
  const columns = await db.query(`SELECT c.table_name AS table, c.column_name AS name,
    c.data_type AS type, c.udt_name AS native_type, c.is_nullable = 'YES' AS nullable,
    c.column_default AS default,
    EXISTS(SELECT 1 FROM information_schema.key_column_usage k
      JOIN information_schema.table_constraints t USING(constraint_catalog,constraint_schema,constraint_name)
      WHERE t.constraint_type='PRIMARY KEY' AND k.table_schema=c.table_schema
        AND k.table_name=c.table_name AND k.column_name=c.column_name) AS primary_key
    FROM information_schema.columns c WHERE c.table_schema='public'
    ORDER BY c.table_name, c.ordinal_position`);
  const relations = await db.query(`SELECT tc.table_name AS table, kcu.column_name AS column,
    ccu.table_name AS target_table, ccu.column_name AS target_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu USING(constraint_catalog,constraint_schema,constraint_name)
    JOIN information_schema.constraint_column_usage ccu USING(constraint_catalog,constraint_schema,constraint_name)
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public'`);
  return { columns: columns.rows, relations: relations.rows };
}

process.on('disconnect', () => process.exit(0));
process.on('message', async message => {
  try {
    const started = performance.now();
    // Explicit transactions are supported across runs. Reset replaces the entire cluster.
    const raw = message.type === 'execute' ? await db.exec(message.sql, { rowMode: 'array' }) : [];
    let remainingBytes = 1_000_000;
    const results = raw.slice(0, 12).map(result => {
      const rows = [];
      for (const row of result.rows.slice(0, 500)) {
        if (remainingBytes <= 0) break;
        rows.push(row.slice(0, 100).map(cell => {
          remainingBytes -= 4; // Account for separators and nulls as well as text.
          if (cell === null || cell === undefined) return null;
          const value = typeof cell === 'bigint' ? cell.toString() : cell;
          const text = typeof value === 'string' ? value : JSON.stringify(value);
          const bytes = Buffer.byteLength(text, 'utf8');
          if (text.length > 4000 || remainingBytes < bytes) {
            const clipped = text.slice(0, Math.min(4000, Math.max(0, Math.floor(remainingBytes / 4)))) + '… [display truncated]';
            remainingBytes -= Buffer.byteLength(clipped, 'utf8');
            return clipped;
          }
          remainingBytes -= bytes;
          return value;
        }));
      }
      return { fields: result.fields.slice(0, 100), fieldsTruncated: result.fields.length > 100,
        affectedRows: result.affectedRows, rowCount: result.rows.length,
        truncated: result.rows.length > rows.length, rows };
    });
    // Schema inspection can fail while the user's explicit transaction is aborted.
    const structure = await schema().catch(() => null);
    process.send?.({ ok: true, results, resultSetsTruncated: raw.length > 12,
      elapsedMs: Math.round(performance.now() - started), schema: structure });
  } catch (error) {
    process.send?.({ ok: false, error: error.message, code: error.code,
      position: error.position, hint: error.hint, detail: error.detail });
  }
});
process.send?.({ ready: true, schema: await schema() });
