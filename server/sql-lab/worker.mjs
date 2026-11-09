// Only a restricted login for this disposable native database is loaded here.
import pg from 'pg';
const db = new pg.Client({ connectionString: process.env.SQL_LAB_DATABASE_URL, connectionTimeoutMillis: 5000 });
await db.connect();
db.on('error', () => process.exit(1));

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
    const response = message.type === 'execute' ? await db.query({ text: message.sql, rowMode: 'array' }) : [];
    const raw = Array.isArray(response) ? response : [response];
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
        affectedRows: result.rowCount ?? 0, rowCount: result.rows.length,
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
