// Re-verify the export against the actual website DB using a read-only transaction.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const base=resolve(root,'database/rubric/diagrams');
const require=createRequire(new URL('../../../server/package.json',import.meta.url));
const s=JSON.parse(readFileSync(resolve(base,'sources/schema-snapshot.json'),'utf8'));
const m=JSON.parse(readFileSync(resolve(base,'sources/chen-relational-manifest.json'),'utf8'));
const config=require('dotenv').parse(readFileSync(resolve(root,'server/.env')));
const db=new (require('pg').Client)({connectionString:config.DATABASE_URL,connectionTimeoutMillis:5000,application_name:'meridian-diagram-read-only-verification'});
const checks=[];
function pass(name){checks.push(name);console.log('PASS '+name);}
await db.connect();
try{
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const identity=(await db.query(`SELECT current_database() AS database,inet_server_port() AS port,current_setting('transaction_read_only') AS read_only`)).rows[0];
  assert.equal(identity.database,s.identity.database);assert.equal(identity.port,s.identity.port);assert.equal(identity.read_only,'on');
  pass('Connected to the website meridian:5432 database in a READ ONLY transaction');
  const columns=(await db.query(`SELECT t.relname AS table_name,a.attname AS column_name,a.attnum AS position,
    format_type(a.atttypid,a.atttypmod) AS sql_type,NOT a.attnotnull AS nullable,pg_get_expr(d.adbin,d.adrelid) AS default_expression
    FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND t.relkind='r' AND t.relname NOT LIKE '\\_%' ORDER BY t.relname,a.attnum`)).rows;
  assert.deepEqual(columns,s.columns);pass('All 43 application tables and 441 column names, types, defaults and nullable flags match the live catalogue');
  const keys=(await db.query(`SELECT t.relname AS table_name,c.conname AS name,c.contype AS kind,c.convalidated AS historical_rows_validated,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    WHERE c.connamespace='public'::regnamespace AND t.relname NOT LIKE '\\_%' ORDER BY t.relname,c.conname`)).rows;
  assert.deepEqual(keys,s.keys);pass('All primary, foreign and CHECK constraint definitions match the live database');
  const indexes=(await db.query(`SELECT t.relname AS table_name,ic.relname AS name,i.indisprimary AS primary_key,i.indisunique AS is_unique,
    i.indisvalid AS is_valid,pg_get_expr(i.indpred,i.indrelid) AS predicate,pg_get_indexdef(i.indexrelid) AS definition,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(num,ord)
      LEFT JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num WHERE k.ord<=i.indnkeyatts ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class ic ON ic.oid=i.indexrelid
    WHERE t.relnamespace='public'::regnamespace AND t.relkind='r' AND t.relname NOT LIKE '\\_%' ORDER BY t.relname,ic.relname`)).rows;
  assert.deepEqual(indexes,s.indexes);pass('All unique indexes and partial predicates match, including one active published timetable per school');
  const relationships=(await db.query(`SELECT c.conname AS name,child.relname AS child,parent.relname AS parent,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=child.oid AND a.attnum=k.num ORDER BY k.ord) AS child_columns,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=parent.oid AND a.attnum=k.num ORDER BY k.ord) AS parent_columns,
    c.confdeltype AS delete_action,c.confupdtype AS update_action
    FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid JOIN pg_class parent ON parent.oid=c.confrelid
    WHERE c.connamespace='public'::regnamespace AND c.contype='f' ORDER BY parent.relname,child.relname,c.conname`)).rows;
  for(const r of relationships){
    r.nullable=r.child_columns.some(name=>columns.find(c=>c.table_name===r.child&&c.column_name===name).nullable);
    r.unique_child=indexes.some(i=>i.table_name===r.child&&i.is_unique&&i.is_valid&&!i.predicate&&i.columns.length===r.child_columns.length&&i.columns.every(c=>r.child_columns.includes(c)));
    r.parent_per_child=r.nullable?'0..1':'1';r.children_per_parent=r.unique_child?'0..1':'0..many';
  }
  assert.deepEqual(relationships,s.relationships);pass('All 67 FK endpoints, delete/update actions and cardinalities match the live catalogue');
  assert.equal(relationships.filter(r=>r.unique_child).length,4);
  assert.equal(relationships.find(r=>r.child==='Timetable'&&r.parent==='School').unique_child,false);
  assert.equal(relationships.find(r=>r.child==='Student'&&r.parent==='User').nullable,true);
  pass('Four genuine 1:1 profile/configuration links are distinguished from the partial timetable uniqueness rule');
  for(const [table,pair] of [['StudentParent',['studentId','parentId']],['ClassSubjectPlan',['classId','subjectId']]]){
    assert.deepEqual(keys.find(k=>k.table_name===table&&k.kind==='p').columns,['id']);
    assert(indexes.some(i=>i.table_name===table&&i.is_unique&&!i.predicate&&JSON.stringify(i.columns)===JSON.stringify(pair)));
  }
  pass('Both M:N associative entities retain the real id PK and the actual composite unique pair');
  assert.equal(columns.find(c=>c.table_name==='KnowledgeItem'&&c.column_name==='embedding').sql_type,'vector(384)');
  assert.equal(columns.find(c=>c.table_name==='FaceEmbedding'&&c.column_name==='vectorString').sql_type,'text');
  assert(!relationships.some(r=>r.child==='NotificationRead'&&r.child_columns.includes('userId')));
  assert(!relationships.some(r=>r.child==='KnowledgeRevision'));
  pass('Vector storage, polymorphic/audit identifiers and undeclared logical references are represented without invented FKs');
  const er=readFileSync(resolve(root,'database/rubric/ER_DIAGRAM.md'),'utf8');
  assert(er.includes('School ||--o{ Timetable'));
  assert(!er.includes('School ||--o| Timetable'));
  for(const obsolete of ['previous_mermaid_er.md','previous_schema_dictionary.md']){
    assert(!existsSync(resolve(base,'sources',obsolete)),`Obsolete mapping must be removed: ${obsolete}`);
  }
  pass('Current Mermaid timetable cardinality is correct and obsolete archived mappings are absent');
  assert.equal(m.warnings.length,0);
  for(const kind of ['chen','relational']){
    const master=m.images.find(i=>i.kind===kind&&i.complete);
    assert.deepEqual([...master.tables].sort(),[...new Set(columns.map(c=>c.table_name))].sort());
    assert.deepEqual([...master.foreignKeys].sort(),relationships.map(r=>r.name).sort());
    const sub=m.images.filter(i=>i.kind===kind&&!i.complete);
    assert.deepEqual(sub.flatMap(i=>i.tables).sort(),[...master.tables].sort());
    assert.deepEqual(sub.flatMap(i=>i.foreignKeys).sort(),[...master.foreignKeys].sort());
  }
  pass('Complete and module diagrams cover every real table and FK exactly once in each notation');
  await db.query('COMMIT');
}finally{await db.end();}
const result={verifiedAt:new Date().toISOString(),sourceSnapshot:s.identity.captured_at,schemaHash:s.schemaHash,database:s.identity.database,port:s.identity.port,readOnly:true,passed:checks.length,checks};
writeFileSync(resolve(base,'sources/live-verification.json'),JSON.stringify(result,null,2)+'\n');
let report='# Diagram verification\n\n';
report+=`Live verification: **${result.verifiedAt}** (UTC). Snapshot: **${result.sourceSnapshot}**. Database: **${result.database}:${result.port}**.\n\n`;
report+=`**${checks.length}/${checks.length} database and coverage checks passed.** All database access used a read-only transaction; no rows, sequences or schema were changed.\n\n`;
for(const check of checks)report+='- PASS: '+check+'.\n';
report+='\nSee [live-verification.json](sources/live-verification.json), [snapshot metadata](sources/schema-snapshot.json), and [render manifest](sources/chen-relational-manifest.json). [Image-structure verification](sources/asset-verification.json) separately checks actual SVG shapes, labels, keys, participation lines, arrows, PNG validity and text fit. The complete diagrams are large zoomable posters; module versions support readable report pages.\n';
writeFileSync(resolve(base,'VERIFICATION.md'),report);
console.log(`VERIFIED ${checks.length}/${checks.length} live catalogue and mapping checks. No database modifications.`);
