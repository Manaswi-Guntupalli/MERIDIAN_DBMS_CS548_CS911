// Read-only catalogue export. No row values or credentials are written.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const base=resolve(root,'database/rubric');
const require=createRequire(new URL('../../../server/package.json',import.meta.url));
const config=require('dotenv').parse(readFileSync(resolve(root,'server/.env')));
const db=new (require('pg').Client)({connectionString:process.env.RUBRIC_DATABASE_URL||config.DATABASE_URL,connectionTimeoutMillis:5000});
const escape=x=>String(x??'').replaceAll('|','\\|').replaceAll('\n',' ');
await db.connect();
try {
  const columns=(await db.query(`SELECT t.relname AS table_name,a.attname AS column_name,
    format_type(a.atttypid,a.atttypmod) AS sql_type,ty.typname AS type_name,NOT a.attnotnull AS nullable,
    pg_get_expr(d.adbin,d.adrelid) AS default_expression
    FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
    JOIN pg_type ty ON ty.oid=a.atttypid LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND t.relkind='r' AND t.relname NOT LIKE '\\_%'
    ORDER BY t.relname,a.attnum`)).rows;
  const keys=(await db.query(`SELECT t.relname AS table_name,c.conname AS name,c.contype AS type,
    ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    WHERE c.connamespace='public'::regnamespace AND t.relname NOT LIKE '\\_%' ORDER BY t.relname,c.conname`)).rows;
  const indexes=(await db.query(`SELECT tablename AS table_name,indexname AS name,indexdef AS definition
    FROM pg_indexes WHERE schemaname='public' AND tablename NOT LIKE '\\_%' ORDER BY tablename,indexname`)).rows;
  const relationships=(await db.query(`SELECT child.relname AS child,parent.relname AS parent,
    a.attname AS column_name,NOT a.attnotnull AS nullable,
    EXISTS(SELECT 1 FROM pg_index i WHERE i.indrelid=child.oid AND i.indisunique AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum) AS unique_child
    FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid JOIN pg_class parent ON parent.oid=c.confrelid
    JOIN pg_attribute a ON a.attrelid=child.oid AND a.attnum=c.conkey[1]
    WHERE c.connamespace='public'::regnamespace AND c.contype='f' AND array_length(c.conkey,1)=1
    ORDER BY parent.relname,child.relname,a.attname`)).rows;
  const tables=[...new Set(columns.map(c=>c.table_name))];
  let schema='# Current database schema and data dictionary\n\n';
  schema+=`Read from PostgreSQL system catalogues on ${new Date().toISOString()}. **${tables.length} application tables**; Prisma migration bookkeeping is excluded. This is schema metadata, not an export of student records, passwords or biometric values.\n\n`;
  schema+='The primary/foreign keys below are database constraints. Prisma implements several composite uniqueness rules with UNIQUE indexes, which are listed separately. A column belonging to a composite unique index is not necessarily unique on its own. PostgreSQL quoting is required for names such as `"Student"` and `"schoolId"`.\n\n';
  for(const table of tables){
    schema+=`## ${table}\n\n| Column | PostgreSQL type | Nullable | Default | Key membership |\n| --- | --- | --- | --- | --- |\n`;
    const constraints=keys.filter(k=>k.table_name===table);
    for(const c of columns.filter(c=>c.table_name===table)){
      const membership=constraints.filter(k=>['p','f','u'].includes(k.type)&&k.columns.includes(c.column_name)).map(k=>({p:'PK',f:'FK',u:'UK'}[k.type]));
      schema+=`| ${escape(c.column_name)} | ${escape(c.sql_type)} | ${c.nullable?'YES':'NO'} | ${escape(c.default_expression||'-')} | ${membership.join(', ')||'-'} |\n`;
    }
    schema+='\nConstraints:\n\n';
    for(const k of constraints) schema+=`- \`${k.name}\`: \`${k.definition}\`\n`;
    schema+='\nIndexes (including UNIQUE indexes):\n\n';
    for(const i of indexes.filter(i=>i.table_name===table)) schema+=`- \`${i.name}\`: \`${i.definition}\`\n`;
    schema+='\n';
  }
  writeFileSync(resolve(base,'SCHEMA.md'),schema.trimEnd()+'\n');
  function diagram(selected,attributes){
    const chosen=new Set(selected);
    let text='```mermaid\nerDiagram\n';
    for(const table of selected){
      text+=`  ${table} {\n`;
      const cs=columns.filter(c=>c.table_name===table);
      for(const c of cs){
        const memberships=keys.filter(k=>k.table_name===table&&['p','f'].includes(k.type)&&k.columns.includes(c.column_name)).map(k=>k.type==='p'?'PK':'FK');
        if(!attributes && memberships.length===0 && !['name','title','role','embedding','admissionNo','amount','paid','status','state','qrVerifiedAt','faceVerifiedAt'].includes(c.column_name))continue;
        text+=`    ${c.type_name.replace(/[^A-Za-z0-9_]/g,'_')} ${c.column_name}${memberships.length?' '+memberships.join(','):''}\n`;
      }
      text+='  }\n';
    }
    for(const r of relationships.filter(r=>chosen.has(r.parent)&&chosen.has(r.child)))text+=`  ${r.parent} ${r.nullable?'|o':'||'}--${r.unique_child?'o|':'o{'} ${r.child} : "${r.column_name}"\n`;
    return text+'```\n';
  }
  const core=['School','User','Teacher','Student','Class','Fee','Payment','Attendance','AttendanceSession','AttendanceVerification','KnowledgeItem'];
  let er='# ER diagrams from the actual PostgreSQL catalogue\n\n';
  er+='The focused diagram shows the principal demonstration entities. The complete diagram includes every application table and foreign key; [SCHEMA.md](SCHEMA.md) contains all column types, constraints and indexes. Attributes named `schoolId` express tenant ownership. Polymorphic identifiers without a declared FK are validated by the installed tenant triggers and are not invented as foreign keys here.\n\n';
  er+='## Core demonstration entities\n\n'+diagram(core,false)+'\n';
  er+='## Complete current ER diagram\n\n'+diagram(tables,true);
  writeFileSync(resolve(base,'ER_DIAGRAM.md'),er);
  console.log(`Exported ${tables.length} tables, ${columns.length} columns and ${relationships.length} relationships from the live catalogue.`);
}finally{await db.end();}
