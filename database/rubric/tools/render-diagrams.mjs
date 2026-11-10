// Deterministic database-design artwork. Reads catalogues only; no row writes.
// Renderer dependency is isolated in tmp/er-render-tools (see diagrams/README.md).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const out=resolve(root,'database/rubric/diagrams');
const require=createRequire(new URL('../../../server/package.json',import.meta.url));
const renderRequire=createRequire(resolve(root,'tmp/er-render-tools/package.json'));
const {instance}=renderRequire('@viz-js/viz');
const sharp=require('sharp');
const config=require('dotenv').parse(readFileSync(resolve(root,'server/.env')));
const db=new (require('pg').Client)({connectionString:config.DATABASE_URL,connectionTimeoutMillis:5000,application_name:'meridian-read-only-diagram-export'});
const escape=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const q=x=>JSON.stringify(String(x));
const md=x=>String(x??'').replaceAll('|','\\|').replaceAll('\n',' ');
const palette={ink:'#142B3A',muted:'#566B78',brand:'#0B756A',paper:'#F4F7F8',line:'#CBD6DC',orange:'#A96512'};
const modules=[
  {key:'01_identity',title:'Identity & enrolment',color:'#0B756A',tables:['School','User','Teacher','Student','Parent','StudentParent','PushDevice']},
  {key:'02_academics',title:'Academics, spaces & scheduling',color:'#365DAD',tables:['AcademicConfig','Class','Subject','Building','Room','ClassSubjectPlan','Timetable','TimetableSlot','StaffAbsence','Substitution']},
  {key:'03_attendance',title:'Attendance & biometrics',color:'#86539A',tables:['Attendance','AttendanceSession','AttendanceVerification','AttendanceEvent','FaceEnrollment','FaceEvent','FaceEmbedding']},
  {key:'04_documents',title:'Document intake & extraction',color:'#B26028',tables:['Document','DocumentPage','ExtractedField','DocumentInsight','DocumentActivity']},
  {key:'05_fees',title:'Fees & payments',color:'#327D4C',tables:['Fee','Payment']},
  {key:'06_community',title:'Communication & school safety',color:'#A84F69',tables:['Notification','NotificationRead','EmergencyIncident','EmergencyAck','EmergencyEvent','Event']},
  {key:'07_knowledge',title:'Knowledge, analytics & audit',color:'#4B6D88',tables:['KnowledgeItem','KnowledgeRevision','AILog','AuditLog','Prediction','Setting']},
];
let snapshot;
await db.connect();
try{
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const identity=(await db.query(`SELECT current_database() AS database,inet_server_port() AS port,
    current_setting('server_version') AS postgres_version,(SELECT extversion FROM pg_extension WHERE extname='vector') AS pgvector_version,
    transaction_timestamp() AS captured_at`)).rows[0];
  assert.equal(identity.database,'meridian','Expected the website database');
  assert.equal(identity.port,5432,'Expected the website PostgreSQL cluster, not SQL Lab');
  const columns=(await db.query(`SELECT t.relname AS table_name,a.attname AS column_name,a.attnum AS position,
    format_type(a.atttypid,a.atttypmod) AS sql_type,NOT a.attnotnull AS nullable,
    pg_get_expr(d.adbin,d.adrelid) AS default_expression
    FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped
    LEFT JOIN pg_attrdef d ON d.adrelid=t.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND t.relkind='r' AND t.relname NOT LIKE '\\_%'
    ORDER BY t.relname,a.attnum`)).rows;
  const keys=(await db.query(`SELECT t.relname AS table_name,c.conname AS name,c.contype AS kind,c.convalidated AS historical_rows_validated,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num ORDER BY k.ord) AS columns,
    pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    WHERE c.connamespace='public'::regnamespace AND t.relname NOT LIKE '\\_%' ORDER BY t.relname,c.conname`)).rows;
  const indexes=(await db.query(`SELECT t.relname AS table_name,ic.relname AS name,i.indisprimary AS primary_key,i.indisunique AS is_unique,
    i.indisvalid AS is_valid,pg_get_expr(i.indpred,i.indrelid) AS predicate,pg_get_indexdef(i.indexrelid) AS definition,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey::smallint[]) WITH ORDINALITY k(num,ord)
      LEFT JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num WHERE k.ord<=i.indnkeyatts ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class ic ON ic.oid=i.indexrelid
    WHERE t.relnamespace='public'::regnamespace AND t.relkind='r' AND t.relname NOT LIKE '\\_%' ORDER BY t.relname,ic.relname`)).rows;
  const relationships=(await db.query(`SELECT c.conname AS name,child.relname AS child,parent.relname AS parent,
    ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=child.oid AND a.attnum=k.num ORDER BY k.ord) AS child_columns,
    ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord)
      JOIN pg_attribute a ON a.attrelid=parent.oid AND a.attnum=k.num ORDER BY k.ord) AS parent_columns,
    c.confdeltype AS delete_action,c.confupdtype AS update_action
    FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid JOIN pg_class parent ON parent.oid=c.confrelid
    WHERE c.connamespace='public'::regnamespace AND c.contype='f' ORDER BY parent.relname,child.relname,c.conname`)).rows;
  const triggers=(await db.query(`SELECT c.relname AS table_name,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal AND c.relnamespace='public'::regnamespace ORDER BY c.relname,t.tgname`)).rows;
  const policies=(await db.query(`SELECT tablename AS table_name,policyname AS name,cmd,roles::text,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname`)).rows;
  snapshot={identity,columns,keys,indexes,relationships,triggers,policies};
  await db.query('COMMIT');
}finally{await db.end();}
const tables=[...new Set(snapshot.columns.map(c=>c.table_name))];
const assigned=modules.flatMap(m=>m.tables);
assert.equal(new Set(assigned).size,assigned.length,'Each table belongs to exactly one module');
assert.deepEqual([...assigned].sort(),[...tables].sort(),'Module list must cover the exact live tables');
const tableColumns=t=>snapshot.columns.filter(c=>c.table_name===t);
const primary=t=>snapshot.keys.find(k=>k.table_name===t&&k.kind==='p')?.columns??[];
const uniqueKeys=t=>snapshot.indexes.filter(i=>i.table_name===t&&i.is_unique&&!i.primary_key);
const owner=t=>modules.find(m=>m.tables.includes(t));
for(const fk of snapshot.relationships){
  assert.equal(fk.child_columns.length,fk.parent_columns.length);
  assert.equal(fk.child_columns.length,1,'Composite FKs require explicit endpoint grouping in this renderer');
  fk.nullable=fk.child_columns.some(name=>tableColumns(fk.child).find(c=>c.column_name===name).nullable);
  // Only unconditional valid uniqueness on exactly the FK columns constrains 1:1.
  fk.unique_child=snapshot.indexes.some(i=>i.table_name===fk.child&&i.is_unique&&i.is_valid&&!i.predicate&&
    i.columns.length===fk.child_columns.length&&i.columns.every(name=>fk.child_columns.includes(name)));
  fk.parent_per_child=fk.nullable?'0..1':'1';
  fk.children_per_parent=fk.unique_child?'0..1':'0..many';
}
const schemaHash=createHash('sha256').update(JSON.stringify({columns:snapshot.columns,keys:snapshot.keys,indexes:snapshot.indexes,relationships:snapshot.relationships})).digest('hex');
mkdirSync(resolve(out,'modules'),{recursive:true});
mkdirSync(resolve(out,'sources'),{recursive:true});
writeFileSync(resolve(out,'sources/schema-snapshot.json'),JSON.stringify({...snapshot,schemaHash},null,2)+'\n');
const viz=await instance();
const imageManifest=[];
const validation=[];
function typeLabel(type){return type.replace('timestamp(3) without time zone','timestamp(3)').replace('timestamp with time zone','timestamptz').replace('double precision','float8').replace('character varying','varchar');}
function tableLabel(table,mode,external){
  const module=owner(table),color=external?'#71818D':module.color;
  const rows=tableColumns(table);
  const header=`<TR><TD COLSPAN="4" BGCOLOR="${color}" ALIGN="LEFT" CELLPADDING="11"><FONT COLOR="white" POINT-SIZE="17"><B>${escape(table)}</B></FONT>${external?'<FONT COLOR="white" POINT-SIZE="10">  [external]</FONT>':''}</TD></TR>`;
  let body='';
  if(mode==='schema')body='<TR><TD BGCOLOR="#EBF0F3"><FONT POINT-SIZE="10">KEY</FONT></TD><TD BGCOLOR="#EBF0F3" ALIGN="LEFT"><FONT POINT-SIZE="10">ATTRIBUTE</FONT></TD><TD BGCOLOR="#EBF0F3" ALIGN="LEFT"><FONT POINT-SIZE="10">PG TYPE</FONT></TD><TD BGCOLOR="#EBF0F3"><FONT POINT-SIZE="10">NULL</FONT></TD></TR>';
  const names=['name','title','code','role','admissionNo','employeeId','date','status','state','amount','paid','category','embedding','operation'];
  const visible=external?rows.filter(c=>primary(table).includes(c.column_name)):
    mode==='schema'?rows:rows.filter(c=>primary(table).includes(c.column_name)||names.includes(c.column_name)).slice(0,7);
  for(const [i,c] of visible.entries()){
    const pk=primary(table).includes(c.column_name);
    const fk=snapshot.relationships.some(r=>r.child===table&&r.child_columns.includes(c.column_name));
    const uq=uniqueKeys(table).some(k=>!k.predicate&&k.columns.length===1&&k.columns[0]===c.column_name);
    const badges=[pk?'PK':'',mode==='schema'&&fk?'FK':'',mode==='schema'&&uq?'UQ':''].filter(Boolean).join(' ');
    const background=i%2?'#F4F7F9':'#FFFFFF';
    if(mode==='er')body+=`<TR><TD COLSPAN="4" BGCOLOR="${background}" ALIGN="LEFT" CELLPADDING="7"><FONT COLOR="${pk?'#9E6715':palette.ink}" POINT-SIZE="13">${pk?'<B>PK  ':''}${escape(c.column_name)}${pk?'</B>':''}</FONT></TD></TR>`;
    else body+=`<TR><TD PORT="${escape(c.column_name)}_in" BGCOLOR="${background}" CELLPADDING="6"><FONT COLOR="${pk?'#996013':'#315F8C'}" POINT-SIZE="10"><B>${badges||'-'}</B></FONT></TD><TD BGCOLOR="${background}" ALIGN="LEFT" CELLPADDING="6"><FONT POINT-SIZE="13">${pk?'<B>':''}${escape(c.column_name)}${pk?'</B>':''}</FONT></TD><TD BGCOLOR="${background}" ALIGN="LEFT" CELLPADDING="6"><FONT COLOR="#536778" POINT-SIZE="11">${escape(typeLabel(c.sql_type))}</FONT></TD><TD PORT="${escape(c.column_name)}_out" BGCOLOR="${background}" CELLPADDING="6"><FONT COLOR="${c.nullable?'#71818D':'#354D5C'}" POINT-SIZE="10">${c.nullable?'yes':'no'}</FONT></TD></TR>`;
  }
  if(!external&&mode==='schema'){
    for(const key of uniqueKeys(table)){
      const prefix=key.predicate?'PARTIAL UQ':'UQ';
      const text=`${prefix} (${key.columns.filter(Boolean).join(', ')})`;
      body+=`<TR><TD COLSPAN="4" ALIGN="LEFT" CELLPADDING="7" BGCOLOR="#EEF4F8"><FONT COLOR="#315F8C" POINT-SIZE="10">${escape(text)}</FONT></TD></TR>`;
    }
    const note=table==='KnowledgeRevision'?'Audit snapshot IDs have no declared FK':
      ['FaceEnrollment','FaceEmbedding'].includes(table)?'subjectId is polymorphic; not a declared FK':null;
    if(note)body+=`<TR><TD COLSPAN="4" ALIGN="LEFT" CELLPADDING="7" BGCOLOR="#FFF5E6"><FONT COLOR="#925D16" POINT-SIZE="10">${escape(note)}</FONT></TD></TR>`;
  }
  return `<<TABLE BORDER="1" COLOR="${external?'#B9C5CD':'#CBD6DC'}" CELLBORDER="0" CELLSPACING="0" CELLPADDING="2">${header}${body}</TABLE>>`;
}
function dotSource(mode,module=null){
  const internal=module?module.tables:tables;
  const fks=snapshot.relationships.filter(r=>internal.includes(r.child));
  const external=module?[...new Set(fks.map(r=>r.parent).filter(t=>!internal.includes(t)))]:[];
  const selected=[...internal,...external];
  let text='digraph Meridian {\n';
  text+='graph [rankdir=LR, newrank=true, compound=true, splines=polyline, nodesep=0.42, ranksep=1.3, pad=0.35, bgcolor="transparent", fontname="Arial", outputorder=edgesfirst];\n';
  text+='node [shape=plain, fontname="Arial", fontcolor="#142B3A", margin=0];\n';
  text+='edge [fontname="Arial", fontsize=10, color="#7B8D9D", fontcolor="#445F75", penwidth=1.15, arrowsize=0.75, labeldistance=2.0, labelangle=24];\n';
  const groups=module?[module]:modules;
  for(const group of groups){
    text+=`subgraph cluster_${group.key} { label=${q(group.title)}; labelloc=t; labeljust=l; fontname="Arial"; fontsize=19; fontcolor=${q(group.color)}; color="#D5DFE4"; style="rounded,filled"; fillcolor="#F6F9FA"; margin=24;\n`;
    for(const table of group.tables)text+=`${q(table)} [label=${tableLabel(table,mode,false)}];\n`;
    text+='}\n';
  }
  for(const table of external)text+=`${q(table)} [label=${tableLabel(table,mode,true)}];\n`;
  for(const fk of fks){
    const parent=mode==='schema'?`${q(fk.parent)}:${q(fk.parent_columns[0]+'_out')}:e`:q(fk.parent);
    const child=mode==='schema'?`${q(fk.child)}:${q(fk.child_columns[0]+'_in')}:w`:q(fk.child);
    const fromArrow=fk.nullable?'teeodot':'teetee',toArrow=fk.unique_child?'teeodot':'crowodot';
    text+=`${parent} -> ${child} [id=${q(fk.name)}, dir=both, arrowtail=${q(fromArrow)}, arrowhead=${q(toArrow)}, taillabel=${q(fk.parent_per_child)}, headlabel=${q(fk.unique_child?'0..1':'0..N')}, label=${q(fk.child_columns.join(', '))}, tooltip=${q(`${fk.child}.${fk.child_columns.join(',')} -> ${fk.parent}.${fk.parent_columns.join(',')}`)}];\n`;
  }
  text+='}\n';
  return {text,selected,internal,external,fks};
}
function frame(svg,title,subtitle,footer){
  const vb=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const [, ,w,h]=vb;
  const width=Math.max(1320,w+96),height=h+310;
  const body=svg.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
  const offsetX=(width-w)/2;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#FFFFFF"/>
<rect x="0" y="0" width="${width}" height="8" fill="#0B756A"/>
<text x="48" y="47" font-family="Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="#0B756A">MERIDIAN / DATABASE DESIGN</text>
<text x="48" y="100" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#142B3A">${escape(title)}</text>
<text x="48" y="135" font-family="Arial,sans-serif" font-size="16" fill="#566B78">${escape(subtitle)}</text>
<g transform="translate(${offsetX},167)">${body}</g>
<line x1="48" y1="${height-119}" x2="${width-48}" y2="${height-119}" stroke="#CFD9DF"/>
<text x="48" y="${height-87}" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#142B3A">1 = exactly one    0..1 = optional one    0..N = zero or many    PK = primary key    FK = foreign key    UQ = unique key</text>
<text x="48" y="${height-58}" font-family="Arial,sans-serif" font-size="13" fill="#566B78">${escape(footer)}</text>
<text x="48" y="${height-29}" font-family="Arial,sans-serif" font-size="13" fill="#566B78">Source: website database meridian:5432 | ${tables.length} application tables | ${snapshot.relationships.length} declared FKs | PostgreSQL ${snapshot.identity.postgres_version} + pgvector ${snapshot.identity.pgvector_version}</text>
</svg>`;
}
async function saveImage(stem,svg,meta={}){
  const file=resolve(out,stem);
  writeFileSync(file+'.svg',svg);
  const size=await sharp(Buffer.from(svg),{limitInputPixels:false}).metadata();
  const scale=Math.min(meta.global?1.5:1.8,Math.sqrt((meta.global?55e6:30e6)/(size.width*size.height)),14000/Math.max(size.width,size.height));
  const width=Math.round(size.width*scale);
  const pngInfo=await sharp(Buffer.from(svg),{limitInputPixels:false}).resize({width}).png().toFile(file+'.png');
  await sharp(Buffer.from(svg),{limitInputPixels:false}).resize({width:1400}).png().toFile(resolve(out,'sources',stem.replaceAll('/','_')+'.preview.png'));
  imageManifest.push({stem,...meta,svgWidth:size.width,svgHeight:size.height,pngWidth:pngInfo.width,pngHeight:pngInfo.height});
  console.log(`Saved ${stem} (${Math.round(size.width)} x ${Math.round(size.height)} SVG units)`);
}
async function render(mode,module=null){
  const graph=dotSource(mode,module);
  const result=viz.render(graph.text,{format:'svg',engine:'dot'});
  assert.equal(result.status,'success',JSON.stringify(result.errors));
  assert(!result.errors.some(e=>e.level==='error'),JSON.stringify(result.errors));
  const ids=[...result.output.matchAll(/<g id="([^"]+)" class="edge">/g)].map(x=>x[1]);
  assert.equal(ids.length,graph.fks.length,'Every real relationship must appear exactly once');
  for(const fk of graph.fks)assert(ids.includes(fk.name),`Missing relationship ${fk.name}`);
  const stem=module?`modules/${module.key}_${mode}`:mode==='er'?'01_complete_er_diagram':'02_complete_relational_schema';
  writeFileSync(resolve(out,'sources',stem.replaceAll('/','_')+'.dot'),graph.text);
  const title=module?`${module.title} / ${mode==='er'?'ER diagram':'relational schema'}`:mode==='er'?'Complete entity-relationship diagram':'Complete relational schema mapping';
  const subtitle=mode==='er'?`${graph.internal.length} entities${module?' in this module':''}; primary keys and selected descriptive attributes. All ${graph.fks.length} declared relationships in scope are shown.`:
    `${graph.internal.length} tables${module?' in this module':''}; ${snapshot.columns.filter(c=>graph.internal.includes(c.table_name)).length} attributes; exact PK/FK columns, PostgreSQL types and nullability.`;
  const footer=module?'Grey boxes are external parent references. Cardinalities describe constraints, not today\'s row counts.':
    mode==='er'?'All application entities and declared foreign keys. The relational schema images contain every attribute.':
    `All ${snapshot.columns.length} attributes are included. Composite UQ applies to the combination; PARTIAL UQ predicates are in RELATIONAL_MAPPING.md.`;
  await saveImage(stem,frame(result.output,title,subtitle,footer),{mode,module:module?.key??null,global:!module,tables:graph.internal,externalTables:graph.external,foreignKeys:graph.fks.map(f=>f.name)});
  validation.push({diagram:stem,tableCount:graph.internal.length,foreignKeyCount:graph.fks.length,graphvizWarnings:result.errors});
}
await render('er');
await render('schema');
for(const module of modules){await render('er',module);await render('schema',module);}
writeFileSync(resolve(out,'sources/render-manifest.json'),JSON.stringify({schemaHash,graphvizVersion:viz.graphvizVersion,images:imageManifest,validation},null,2)+'\n');
console.log(`Rendered ${imageManifest.length} diagrams from a read-only snapshot of ${tables.length} tables, ${snapshot.columns.length} columns and ${snapshot.relationships.length} FKs.`);
