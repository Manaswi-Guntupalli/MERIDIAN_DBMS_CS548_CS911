// Execute the files themselves against the website DB; compare or record result tables.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const base = fileURLToPath(new URL('./', import.meta.url));
const require = createRequire(new URL('../../server/package.json', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(base, 'examples.json'), 'utf8'));
const args = process.argv.slice(2);
assert(args.every(x => ['--verify','--record','--list'].includes(x)), 'Use --verify (default), --record, or --list');
assert(!(args.includes('--record') && args.includes('--verify')), 'Choose --record or --verify');
if (args.includes('--list')) {
  for (const item of manifest.examples) console.log(`${item.file}: ${item.title}`);
  process.exit(0);
}
const record = args.includes('--record');
const config = require('dotenv').parse(readFileSync(resolve(root, 'server/.env')));
const makeClient = () => new (require('pg').Client)({
  connectionString: process.env.RUBRIC_DATABASE_URL || config.DATABASE_URL,
  application_name: 'meridian-rubric-verification', connectionTimeoutMillis: 5000,
});
const client = makeClient();
const hash = text => createHash('sha256').update(text).digest('hex');
const cell = value => {
  if (value === null) return 'NULL';
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return raw.replaceAll('|','\\|').replaceAll('\r','').replaceAll('\n','<br>');
};
function render(item, results) {
  let out = `# Expected output: ${item.title}\n\n`;
  out += `SQL: [${item.file.split('/').at(-1)}](${item.file.split('/').at(-1)})\n\n`;
  out += `Data: ${item.data}.\n\n`;
  out += 'Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.\n\n';
  const tables = results.filter(r => r.fields.length > 0);
  for (const [i, result] of tables.entries()) {
    const columns = result.fields.map(f => f.name);
    out += `## Result ${i+1}: ${result.command} (${result.rows.length} ${result.rows.length === 1 ? 'row' : 'rows'})\n\n`;
    out += '| ' + columns.map(cell).join(' | ') + ' |\n';
    out += '| ' + columns.map(()=>'---').join(' | ') + ' |\n';
    for (const row of result.rows) out += '| ' + columns.map(col=>cell(row[col])).join(' | ') + ' |\n';
    if (result.rows.length === 0) out += '\nNo rows returned.\n';
    out += '\n';
  }
  return out + 'Final command: `ROLLBACK`. Demo rows and schema changes are not retained.\n';
}
const ident = name => '"'+name.replaceAll('"','""')+'"';
function checkBehavior(file,results) {
  const tables=results.filter(r=>r.fields.length>0).map(r=>r.rows);
  const first=tables[0]?.[0];
  if (file==='01_ddl/03_drop_table.sql') {
    assert.equal(tables[1][0].demo_table_dropped,true);
    assert.equal(tables[1][0].actual_student_table_exists,true);
  }
  if (file==='01_ddl/04_constraints.sql') assert.deepEqual(tables[0].map(r=>r.sqlstate).sort(),['23502','23503','23505','23514']);
  if (file==='02_dml/04_delete.sql') assert.equal(tables[1][0].demo_rows_remaining,0);
  if (file==='05_advanced_sql/01_stored_payment_function.sql') {
    assert.equal(Number(first.paid),250);
    assert.equal(first.status,'PARTIAL');
    assert.equal(Number(tables[1][0].outstanding),750);
    assert.equal(tables[1][0].payment_rows,1);
  }
  if (file==='05_advanced_sql/02_stored_procedure.sql') assert.equal(first.status,'PAID');
  if (file==='05_advanced_sql/03_trigger_audit.sql') {
    assert.deepEqual(tables[0].map(r=>r.operation),['INSERT','UPDATE','DELETE']);
    assert.deepEqual(tables[0].map(r=>r.revision),[1,2,2]);
    assert(tables[0].every(r=>r.correct_actor));
  }
  if (file==='05_advanced_sql/04_transaction_rollback.sql') {
    assert.equal(Number(tables[1][0].paid),0);
    assert.equal(tables[1][0].payment_rows,0);
  }
  if (file==='05_advanced_sql/05_validation_and_failed_payment.sql') {
    assert.deepEqual(tables[0].map(r=>r.valid),[true,false,false]);
    assert.equal(tables[1][0].overpayment_sqlstate,'P0001');
    assert.equal(tables[2][0].payment_rows,0);
  }
  if (file==='06_pgvector/02_vector_insert.sql') {
    assert.equal(tables[0].length,6);
    assert(tables[0].every(r=>r.dimensions===384 && Number(r.norm)===1 && r.model==='Xenova/all-MiniLM-L6-v2'));
  }
  if (file==='06_pgvector/03_vector_similarity_search.sql') {
    assert.equal(first.title,'Reporting student absence');
    assert.equal(tables[0].length,6);
    assert(Number(first.cosine_similarity)>0.5);
    assert(tables[0].every((r,i,rows)=>i===0 || Number(r.cosine_similarity)<=Number(rows[i-1].cosine_similarity)));
  }
  if (file==='06_pgvector/04_vector_update.sql') {
    assert.equal(first.revision,2);
    assert.equal(Number(tables[1][0].similarity_to_updated_embedding),1);
  }
  if (file==='06_pgvector/05_vector_delete.sql') {
    assert.equal(tables[1][0].remaining_searchable_rows,5);
    assert.deepEqual(tables[2].map(r=>r.operation),['INSERT','DELETE']);
  }
  if (file==='07_permissions_and_integrity/01_roles_grants_policies.sql') {
    assert.equal(tables[4][0].can_select_after_grant,true);
    assert.equal(tables[5][0].can_select_after_revoke,false);
  }
  if (file==='07_permissions_and_integrity/02_admin_allowed.sql') {
    assert.equal(first.database_role,'meridian_knowledge');
    assert.equal(first.application_role,'ADMIN');
    assert.equal(tables[1].length,1);
    assert.equal(tables[3][0].revision,2);
  }
  if (file==='07_permissions_and_integrity/03_teacher_read_only.sql') {
    assert.equal(first.database_role,'meridian_knowledge');
    assert.equal(first.application_role,'TEACHER');
    assert.equal(tables[1][0].visible_demo_entries,6);
    assert.equal(tables[2][0].updated_rows,0);
    assert.equal(tables[3][0].deleted_rows,0);
    assert.equal(tables[4][0].rejected_insert_sqlstate,'42501');
  }
  if (file==='07_permissions_and_integrity/04_student_cannot_read.sql') assert.equal(tables[1][0].visible_demo_entries,0);
  if (file==='07_permissions_and_integrity/05_wrong_school_context.sql') {
    assert.equal(first.mismatched_identity_rejected,true);
    assert.equal(tables[1][0].visible_demo_entries,0);
  }
  if (file==='07_permissions_and_integrity/06_database_validation.sql') {
    assert.equal(tables[0].length,6);
    assert(tables[0].every(r=>r.sqlstate==='23514'));
  }
}
async function fingerprint() {
  const tables = (await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows;
  const state = [];
  for (const { tablename } of tables) {
    // Hash values inside PostgreSQL. No password, session token, or biometric data is exported.
    const result = await client.query(`SELECT count(*)::integer AS rows,
      md5(coalesce(string_agg(row_text,'' ORDER BY row_text),'')) AS digest
      FROM (SELECT to_jsonb(t)::text AS row_text FROM public.${ident(tablename)} t) s`);
    state.push({ table: tablename, ...result.rows[0] });
  }
  const schema = (await client.query(`SELECT 'constraint' AS kind,c.conrelid::regclass::text AS object,c.conname AS name,pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c WHERE c.connamespace='public'::regnamespace
    UNION ALL SELECT 'index',tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'
    UNION ALL SELECT 'view',viewname,viewname,definition FROM pg_views WHERE schemaname='public'
    UNION ALL SELECT 'policy',tablename,policyname,concat_ws('|',cmd,qual,with_check) FROM pg_policies WHERE schemaname='public'
    ORDER BY kind,object,name`)).rows;
  return { tables: state, schemaHash: hash(JSON.stringify(schema)) };
}
const checks = [];
const failures = [];
await client.connect();
try {
  const identity = (await client.query(`SELECT current_database() AS database,current_user AS login,
    current_setting('server_version') AS postgres_version,inet_server_port() AS port,
    (SELECT extversion FROM pg_extension WHERE extname='vector') AS pgvector_version,
    (SELECT count(*)::integer FROM public."School" WHERE code='MERIDIAN') AS school_matches`)).rows[0];
  assert.equal(identity.school_matches,1,'Must connect to the actual seeded website database');
  assert(identity.pgvector_version,'pgvector must be installed');
  assert(identity.port !== 5433,'Do not run against the disposable SQL Lab cluster');
  // Reserved IDs must be absent: never replace any pre-existing record.
  for (const table of ['Student','Subject','Fee','Payment','AttendanceSession','AttendanceVerification','KnowledgeItem']) {
    const existing = await client.query(`SELECT count(*)::integer AS rows FROM public.${ident(table)} WHERE id LIKE 'rubric_demo_%'`);
    assert.equal(existing.rows[0].rows,0,`Reserved rubric_demo_ IDs already exist in ${table}; review them before running`);
  }
  const before = await fingerprint();
  for (const item of manifest.examples) {
    const sql = readFileSync(resolve(base,item.file),'utf8');
    assert(/\bBEGIN;/i.test(sql) && /ROLLBACK;\s*$/.test(sql),`${item.file} must end in rollback`);
    // Fresh session proves that a file does not rely on an earlier example's
    // temporary schema, role, session settings, fixtures, or helper functions.
    const exampleDb = makeClient();
    await exampleDb.connect();
    try {
      const value = await exampleDb.query(sql);
      const results = Array.isArray(value) ? value : [value];
      assert.equal(results.at(-1).command,'ROLLBACK',`${item.file} did not finish with rollback`);
      checkBehavior(item.file,results);
      const output = render(item,results);
      const expectedFile = resolve(base,item.file.replace(/\.sql$/,'.expected.md'));
      if (record) writeFileSync(expectedFile,output);
      else {
        assert(existsSync(expectedFile),`Missing expected output for ${item.file}`);
        assert.equal(output,readFileSync(expectedFile,'utf8'),'Output differs from the recorded snapshot. Inspect changed school data before using --record.');
      }
      const resultRows = results.filter(r=>r.fields.length>0).map(r=>r.rows.length);
      checks.push({ file:item.file,passed:true,sqlSha256:hash(sql),resultRows });
      console.log(`PASS ${item.file} (${resultRows.join(', ')} result rows)`);
    } catch (error) {
      await exampleDb.query('ROLLBACK');
      failures.push({ file:item.file,error:error.message });
      console.error(`FAIL ${item.file}: ${error.message.slice(0,350)}`);
    } finally {
      await exampleDb.end();
    }
  }
  const after = await fingerprint();
  const unchanged = JSON.stringify(before)===JSON.stringify(after);
  if (!unchanged) failures.push({ file:'database-state',error:'Persistent rows/schema changed during verification; check concurrent app activity before attributing it to these examples.' });
  const report = { capturedAt:new Date().toISOString(),mode:record?'record':'verify',independentSessionPerFile:true,database:identity,
    passed:checks.length,failed:failures.length,persistentRowsAndSchemaUnchanged:unchanged,
    publicTableCount:before.tables.length,examples:checks,failures };
  if (record && failures.length===0) {
    writeFileSync(resolve(base,'verification.json'),JSON.stringify(report,null,2)+'\n');
    writeFileSync(resolve(base,'VERIFICATION.md'),`# Live database verification\n\nCaptured: **${report.capturedAt}** (UTC).\n\n- Database: **${identity.database}**, local port **${identity.port}**.\n- PostgreSQL: **${identity.postgres_version}**; pgvector: **${identity.pgvector_version}**.\n- SQL files executed successfully: **${checks.length}/${manifest.examples.length}**.\n- Every file executed in a **fresh PostgreSQL connection**, proving it does not require an earlier example.\n- Public table data and inspected persistent schema unchanged afterward: **${unchanged}**, across **${before.tables.length} tables**.\n- Each file finished with its own ROLLBACK.\n- Machine-readable details and file SHA-256 hashes: [verification.json](verification.json).\n\nExpected outputs are a snapshot of this database, not a promise that future student counts, fees or attendance totals remain identical. Re-run \`node database/rubric/run-examples.mjs --verify\` from the repository root to compare them. Intentional data changes require inspecting the differences, then \`--record\` to capture new outputs.\n\nRollback restores table rows and transactional DDL. PostgreSQL sequence values used by the existing audit trigger can advance even when a transaction rolls back; normal gaps in audit IDs are expected. Audit IDs and timestamps are intentionally excluded from example outputs.\n`);
  }
  console.log(`\n${checks.length}/${manifest.examples.length} examples passed; ${failures.length} failures. Persistent rows/schema unchanged: ${unchanged}.`);
  if (failures.length) process.exitCode=1;
} finally {
  await client.end();
}
