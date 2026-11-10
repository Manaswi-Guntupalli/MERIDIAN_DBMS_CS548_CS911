// Chen ER and horizontal relational mapping, matching the supplied visual reference.
// Source is a read-only PostgreSQL catalogue snapshot; no school data is read/written.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const base=resolve(root,'database/rubric/diagrams');
// Keep font caches inside the workspace rather than a protected user cache.
if(process.platform==='win32'){
  const cache=resolve(root,'tmp/diagram-font-cache');
  mkdirSync(cache,{recursive:true});
  const fontConfig=resolve(cache,'fonts.conf');
  const fontDir=(process.env.WINDIR||'C:/Windows').replaceAll('\\','/')+'/Fonts';
  writeFileSync(fontConfig,`<fontconfig><dir>${fontDir}</dir><cachedir>${cache.replaceAll('\\','/')}</cachedir></fontconfig>`);
  process.env.FONTCONFIG_FILE=fontConfig;
}
const require=createRequire(new URL('../../../server/package.json',import.meta.url));
const renderer=createRequire(resolve(root,'tmp/er-render-tools/package.json'));
const {instance}=renderer('@viz-js/viz');
const sharp=require('sharp');
const {createCanvas}=require('@napi-rs/canvas');
const measure=createCanvas(20,20).getContext('2d');
const s=JSON.parse(readFileSync(resolve(base,'sources/schema-snapshot.json'),'utf8'));
const modules=[
  {key:'01_identity',title:'Identity and enrolment',tables:['School','User','Teacher','Student','Parent','StudentParent','PushDevice']},
  {key:'02_academics',title:'Academics, spaces and scheduling',tables:['AcademicConfig','Class','Subject','Building','Room','ClassSubjectPlan','Timetable','TimetableSlot','StaffAbsence','Substitution']},
  {key:'03_attendance',title:'Attendance and biometrics',tables:['Attendance','AttendanceSession','AttendanceVerification','AttendanceEvent','FaceEnrollment','FaceEvent','FaceEmbedding']},
  {key:'04_documents',title:'Document intake and extraction',tables:['Document','DocumentPage','ExtractedField','DocumentInsight','DocumentActivity']},
  {key:'05_fees',title:'Fees and payments',tables:['Fee','Payment']},
  {key:'06_community',title:'Communication and school safety',tables:['Notification','NotificationRead','EmergencyIncident','EmergencyAck','EmergencyEvent','Event']},
  {key:'07_knowledge',title:'Knowledge, analytics and audit',tables:['KnowledgeItem','KnowledgeRevision','AILog','AuditLog','Prediction','Setting']},
];
const tables=[...new Set(s.columns.map(c=>c.table_name))];
assert.deepEqual(modules.flatMap(m=>m.tables).sort(),[...tables].sort());
const columns=t=>s.columns.filter(c=>c.table_name===t);
const pk=t=>s.keys.find(k=>k.table_name===t&&k.kind==='p').columns;
const fks=t=>s.relationships.filter(r=>r.child===t);
const uq=t=>s.indexes.filter(i=>i.table_name===t&&i.is_unique&&!i.primary_key);
const fkFor=(t,c)=>fks(t).find(f=>f.child_columns.includes(c));
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const quote=x=>JSON.stringify(String(x));
const text=(x,y,value,size=16,extra='')=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}"${extra.includes('fill=')?'':' fill="#172734"'} ${extra}>${esc(value)}</text>`;
const results=[];
const warnings=[];
for(const folder of ['chen/modules','relational/modules','previews','sources/chen'])mkdirSync(resolve(base,folder),{recursive:true});
const viz=await instance();
function scope(module){
  const internal=module?module.tables:tables;
  const relationships=s.relationships.filter(r=>internal.includes(r.child));
  const external=module?[...new Set(relationships.map(r=>r.parent).filter(t=>!internal.includes(t)))]:[];
  return {internal,relationships,external};
}
function frame(body,w,h,title,subtitle,lines){
  const width=Math.max(w+100,1600),height=h+330,x=(width-w)/2;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#FCFBF8"/>`;
  svg+=text(50,42,'MERIDIAN  /  DBMS DESIGN',18,'font-weight="700" letter-spacing="2"');
  svg+=text(50,96,title,34,'font-weight="700"');
  svg+=text(50,130,subtitle,16);
  svg+=`<g transform="translate(${x},166)">${body}</g>`;
  svg+=`<line x1="50" y1="${height-129}" x2="${width-50}" y2="${height-129}" stroke="#CED5DA"/>`;
  lines.forEach((line,i)=>svg+=text(50,height-96+i*25,line,14));
  svg+=text(50,height-23,`Live catalogue: ${s.identity.database}:${s.identity.port} | ${tables.length} application tables | ${s.columns.length} columns | ${s.relationships.length} declared FKs`,13);
  return svg+'</svg>';
}
async function save(stem,svg,meta){
  const [,width,height]=svg.match(/width="([\d.]+)" height="([\d.]+)"/).map(Number);
  writeFileSync(resolve(base,stem+'.svg'),svg);
  const scale=Math.min(meta.complete?1.4:1.8,Math.sqrt(50e6/(width*height)),16000/Math.max(width,height));
  const targetWidth=Math.round(width*scale);
  const pngInfo=await sharp(Buffer.from(svg),{density:Math.min(72,72*scale),limitInputPixels:false}).resize({width:targetWidth}).png().toFile(resolve(base,stem+'.png'));
  const preview=stem.replaceAll('/','_')+'.png';
  await sharp(Buffer.from(svg),{density:Math.min(72,72*1800/width),limitInputPixels:false}).resize({width:1800}).png().toFile(resolve(base,'previews',preview));
  results.push({stem,...meta,svgWidth:width,svgHeight:height,pngWidth:pngInfo.width,pngHeight:pngInfo.height,preview:'previews/'+preview});
  console.log(`Saved ${stem}: ${Math.round(width)} x ${Math.round(height)} SVG units`);
}
const relationNames={schoolId:'Belongs to school',userId:'Has login account',classId:'Assigned to class',studentId:'For student',parentId:'Links guardian',teacherId:'Assigned teacher',classTeacherId:'Class teacher',subjectId:'Covers subject',roomId:'Uses room',buildingId:'Located in',documentId:'Part of document',incidentId:'For incident',feeId:'Pays fee',notificationId:'Reads notice',sessionId:'In session',enrollmentId:'From enrolment',timetableId:'Part of timetable',absenceId:'Covers absence',subTeacherId:'Substitute teacher',createdBy:'Created by',actorId:'Performed by'};
function chenDot(module){
  const {internal,relationships,external}=scope(module);
  let dot='digraph Chen {\n';
  dot+='graph [rankdir=LR, newrank=true, compound=true, splines=polyline, nodesep=0.18, ranksep=0.8, pad=0.4, bgcolor="transparent", outputorder=edgesfirst, fontname="Arial"];\n';
  dot+='node [fontname="Arial",fontsize=13,fontcolor="#152A38"];\n';
  dot+='edge [fontname="Arial",fontsize=13,fontcolor="#D73232",color="#4A5966",penwidth=0.8,arrowsize=0.6,dir=none];\n';
  const entityIds=[],attributeIds=[],relationshipIds=[];
  const addEntity=(table,externalRef)=>{
    const entity='ent_'+table;entityIds.push(entity);
    const isLink=['StudentParent','ClassSubjectPlan'].includes(table);
    dot+=`subgraph ${quote('cluster_attributes_'+table)} { style=invis; margin=12; label="";\n`;
    const label=externalRef?table+' [external]':isLink?table+'\n[associative entity]':table;
    dot+=`${quote(entity)} [shape=box,style=filled,fillcolor=${quote(externalRef?'#EDF0F2':'#DDE9FF')},color=${quote(externalRef?'#8C9AA7':'#3B72FF')},penwidth=1.2,width=1.7,height=0.55,label=${quote(label)}];\n`;
    // Native FK fields are relationships in Chen, then columns in the mapping.
    const attrs=externalRef?columns(table).filter(c=>pk(table).includes(c.column_name)):
      columns(table).filter(c=>!fkFor(table,c.column_name)||pk(table).includes(c.column_name));
    const left=attrs.filter((_,i)=>i%2===0),right=attrs.filter((_,i)=>i%2===1);
    for(const [bank,list] of [['left',left],['right',right]]){
      if(list.length)dot+='{rank=same;\n';
      for(const c of list){
        const id='attr_'+table+'.'+c.column_name;attributeIds.push({id,table,column:c.column_name});
        const label=pk(table).includes(c.column_name)?`<<U>${esc(c.column_name)}</U>>`:quote(c.column_name);
        dot+=`${quote(id)} [shape=ellipse,style=filled,fillcolor="#F1FCF8",color="#0C9C7B",penwidth=0.85,margin="0.12,0.07",label=${label}];\n`;
      }
      if(list.length)dot+='}\n';
      for(const c of list){
        const id='attr_'+table+'.'+c.column_name;
        dot+=bank==='left'?`${quote(id)} -> ${quote(entity)} [color="#929EA7",weight=3];\n`:`${quote(entity)} -> ${quote(id)} [color="#929EA7",weight=3];\n`;
      }
    }
    dot+='}\n';
  };
  for(const t of internal)addEntity(t,false);
  for(const t of external)addEntity(t,true);
  for(const r of relationships){
    const id='rel_'+r.name;relationshipIds.push(r.name);
    const label=(relationNames[r.child_columns[0]]||'References')+'\n['+r.child_columns.join(', ')+']';
    dot+=`${quote(id)} [shape=diamond,style=filled,fillcolor="#FFF2DB",color="#F47B20",penwidth=1.1,fontsize=12,margin="0.08,0.05",label=${quote(label)}];\n`;
    dot+=`${quote('ent_'+r.parent)} -> ${quote(id)} [id=${quote(r.name+'_parent')},label="1",minlen=1,weight=2];\n`;
    dot+=`${quote(id)} -> ${quote('ent_'+r.child)} [id=${quote(r.name+'_child')},label=${quote(r.unique_child?'1':'N')},minlen=1,weight=2,color=${quote(r.nullable?'#4A5966':'#4A5966:#4A5966')}];\n`;
  }
  dot+='}\n';
  return {dot,entityIds,attributeIds,relationshipIds,internal,external,relationships};
}
async function chen(module){
  const g=chenDot(module),render=viz.render(g.dot,{engine:'dot',format:'svg'});
  assert.equal(render.status,'success',JSON.stringify(render.errors));
  assert(!render.errors.some(e=>e.level==='error'),JSON.stringify(render.errors));
  warnings.push(...render.errors.map(error=>({module:module?.key??'complete',...error})));
  const nodes=[...render.output.matchAll(/<title>([^<]+)<\/title>/g)].map(m=>m[1].replaceAll('&gt;','>').replaceAll('&amp;','&'));
  for(const id of g.entityIds)assert(nodes.includes(id),`Missing Chen entity ${id}`);
  for(const {id} of g.attributeIds)assert(nodes.includes(id),`Missing attribute oval ${id}`);
  for(const name of g.relationshipIds)assert(nodes.includes('rel_'+name),`Missing relationship diamond ${name}`);
  const vb=render.output.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const body=render.output.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
  const stem=module?'chen/modules/'+module.key:'chen/01_complete_chen_er';
  writeFileSync(resolve(base,'sources/chen',(module?.key??'complete')+'.dot'),g.dot);
  const title=module?'Chen ER / '+module.title:'Meridian / complete Chen ER diagram';
  const subtitle=`${g.internal.length} entities; ${g.relationships.length} relationship diamonds. Ovals show non-FK attributes; FK columns are represented by relationships.`;
  const svg=frame(body,vb[2],vb[3],title,subtitle,[
    'Rectangle = entity; diamond = relationship; ellipse = attribute; underlined attribute = actual primary key.',
    '1:N / 1:1 are maximum cardinality ratios. Double line = total participation (NOT NULL FK); single line = partial participation.',
    'Associative entities retain their actual surrogate id PK. Grey entities reference another module; no weak or multivalued symbols are invented.',
  ]);
  await save(stem,svg,{kind:'chen',module:module?.key??null,complete:!module,tables:g.internal,externalTables:g.external,attributes:g.attributeIds,foreignKeys:g.relationshipIds});
}
const rankPriority=['School','User','Building','Room','Teacher','Parent','Subject','AcademicConfig','Class','Student','StudentParent','ClassSubjectPlan','Timetable','TimetableSlot','StaffAbsence','Substitution','Fee','Payment','AttendanceSession','AttendanceVerification','AttendanceEvent','Attendance','FaceEnrollment','FaceEmbedding','FaceEvent','Document','DocumentPage','ExtractedField','DocumentInsight','DocumentActivity','Notification','NotificationRead','EmergencyIncident','EmergencyAck','EmergencyEvent','Event','AILog','AuditLog','Prediction','Setting','KnowledgeItem','KnowledgeRevision','PushDevice'];
function tableOrder(selected){
  const pending=new Set(selected),done=[];
  while(pending.size){
    const ready=[...pending].filter(t=>fks(t).every(r=>r.parent===t||!pending.has(r.parent)));
    assert(ready.length,'FK cycle requires an explicit layout rule');
    ready.sort((a,b)=>rankPriority.indexOf(a)-rankPriority.indexOf(b));
    done.push(ready[0]);pending.delete(ready[0]);
  }
  return done;
}
const targetTables=[...new Set(s.relationships.map(r=>r.parent))].sort((a,b)=>rankPriority.indexOf(a)-rankPriority.indexOf(b));
const hues=['#2563EB','#DC2626','#16A34A','#9333EA','#EA580C','#0891B2','#C026D3','#4F46E5','#0D9488','#B45309','#DB2777','#65A30D','#0369A1','#7C3AED','#BE123C','#15803D','#7C2D12','#475569'];
const color=t=>hues[targetTables.indexOf(t)%hues.length];
const widthOf=(value,italic=false)=>{measure.font=(italic?'italic ':'')+'16px Arial';return Math.max(61,Math.ceil(measure.measureText(value).width+28));};
async function relational(module){
  const {internal,external,relationships}=scope(module);
  const order=tableOrder([...internal,...external]);
  const left=150+relationships.length*10;
  const positions={},fields=[];
  let y=218,maxRight=0;
  const incoming=new Map(),outgoing=new Map();
  for(const t of order){incoming.set(t,relationships.filter(r=>r.parent===t));outgoing.set(t,relationships.filter(r=>r.child===t));}
  for(const table of order){
    const ext=external.includes(table),attrs=ext?columns(table).filter(c=>pk(table).includes(c.column_name)):columns(table);
    const routes=Math.max(incoming.get(table).length*2.5,outgoing.get(table).length*4);
    y+=44+routes;
    let x=left;
    const cells=attrs.map(c=>{const w=Math.max(widthOf(c.column_name,!!fkFor(table,c.column_name)),pk(table).includes(c.column_name)?incoming.get(table).length*5+24:0);const entry={column:c,x,y,width:w,height:34};x+=w;return entry;});
    const uqLine=ext?'External reference: primary key only':uq(table).map(k=>`${k.predicate?'PARTIAL ':''}UQ (${k.columns.join(', ')})`).join('   |   ');
    positions[table]={cells,y,end:x,external:ext,uqLine};
    maxRight=Math.max(maxRight,x+widthOf(table)+(ext?180:60));
    fields.push(...attrs.map(c=>({table,column:c.column_name,external:ext})));
    y+=60;
  }
  const legendTargets=[...new Set(relationships.map(r=>r.parent))].sort((a,b)=>targetTables.indexOf(a)-targetTables.indexOf(b));
  const width=Math.max(1600,maxRight+70),height=y+220+Math.ceil(legendTargets.length/6)*32;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>`;
  for(const t of legendTargets)svg+=`<marker id="arrow_${t}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="${color(t)}"/></marker>`;
  svg+='</defs><rect width="100%" height="100%" fill="white"/>';
  svg+=text(48,40,'MERIDIAN  /  RELATIONAL SCHEMA MAPPING',18,'font-weight="700" letter-spacing="2"');
  svg+=text(48,92,module?module.title:'Complete website database schema',34,'font-weight="700"');
  svg+=text(48,128,`${internal.length} relations; ${s.columns.filter(c=>internal.includes(c.table_name)).length} attributes; ${relationships.length} declared foreign keys. Each relation is one horizontal attribute row.`,17);
  svg+=text(48,161,'Underlined = primary key; coloured italic = foreign key; arrow points from FK to referenced key. UQ identifies a unique combination.',16);
  svg+=text(48,192,'Only declared database FKs receive arrows. Exact types, nullability and logical-reference notes are in RELATIONAL_MAPPING.md.',15);
  const sourceCount=new Map(),targetCount=new Map();
  const arrowInfo=[];
  const sorted=[...relationships].sort((a,b)=>order.indexOf(a.parent)-order.indexOf(b.parent)||order.indexOf(a.child)-order.indexOf(b.child)||a.name.localeCompare(b.name));
  // All paths use the blank lane above a relation and a dedicated left-gutter lane.
  // They never run through attribute cell interiors.
  for(const [i,r] of sorted.entries()){
    const source=positions[r.child],target=positions[r.parent];
    const sourceCell=source.cells.find(c=>c.column.column_name===r.child_columns[0]);
    const targetCell=target.cells.find(c=>c.column.column_name===r.parent_columns[0]);
    assert(sourceCell&&targetCell,'Each FK endpoint must resolve to a real cell');
    const si=sourceCount.get(r.child)||0,ti=targetCount.get(r.parent)||0;
    sourceCount.set(r.child,si+1);targetCount.set(r.parent,ti+1);
    const sx=sourceCell.x+sourceCell.width/2,sy=source.y;
    const tx=targetCell.x+10+(targetCell.width-20)*(ti+1)/(incoming.get(r.parent).length+1),ty=target.y;
    const sourceLaneY=sy-16-si*4,targetLaneY=ty-17-ti*2.5,laneX=left-35-i*10;
    const d=`M ${sx} ${sy} V ${sourceLaneY} H ${laneX} V ${targetLaneY} H ${tx} V ${ty-1}`;
    svg+=`<path id="fk_${r.name}" d="${d}" fill="none" stroke="${color(r.parent)}" stroke-width="1.35" stroke-linejoin="round" marker-end="url(#arrow_${r.parent})"><title>${esc(`${r.child}.${r.child_columns} -> ${r.parent}.${r.parent_columns}`)}</title></path>`;
    arrowInfo.push({name:r.name,source:{table:r.child,column:r.child_columns[0]},target:{table:r.parent,column:r.parent_columns[0]},path:d});
  }
  for(const table of order){
    const row=positions[table];
    for(const cell of row.cells){
      const c=cell.column,fk=fkFor(table,c.column_name),isPk=pk(table).includes(c.column_name);
      svg+=`<rect id="cell_${table}_${c.column_name}" x="${cell.x}" y="${cell.y}" width="${cell.width}" height="34" fill="${row.external?'#F1F4F7':'#FFFFFF'}" stroke="#1D2D3D" stroke-width="1"/>`;
      svg+=`<text x="${cell.x+cell.width/2}" y="${cell.y+22}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="${fk?color(fk.parent):'#172734'}"${fk?' font-style="italic"':''}${isPk?' text-decoration="underline" font-weight="700"':''}>${esc(c.column_name)}</text>`;
    }
    svg+=text(row.end+18,row.y+23,table+(row.external?' [external]':''),19,'font-weight="700"');
    if(row.uqLine)svg+=text(left,row.y+55,row.uqLine,12,'fill="#536577"');
  }
  let legendY=y+45;
  svg+=text(48,legendY,'Arrows point to:',16,'font-weight="700"');legendY+=34;
  legendTargets.forEach((table,i)=>{
    const lx=48+(i%6)*240,ly=legendY+Math.floor(i/6)*32;
    svg+=`<line x1="${lx}" y1="${ly-5}" x2="${lx+30}" y2="${ly-5}" stroke="${color(table)}" stroke-width="3"/>`;
    svg+=text(lx+39,ly,table,14);
  });
  svg+=text(48,height-56,`Source: actual website PostgreSQL ${s.identity.database}:${s.identity.port}. Grey external rows show only referenced primary keys.`,14);
  svg+=text(48,height-30,'Composite uniqueness applies to the whole listed combination; it does not make each component individually unique.',14);
  svg+='</svg>';
  const stem=module?'relational/modules/'+module.key:'relational/01_complete_relational_mapping';
  await save(stem,svg,{kind:'relational',module:module?.key??null,complete:!module,tables:internal,externalTables:external,fields,foreignKeys:relationships.map(r=>r.name),arrows:arrowInfo});
}
await chen(null);
await relational(null);
for(const module of modules){await chen(module);await relational(module);}
const completeChen=results.find(r=>r.kind==='chen'&&r.complete);
const completeMapping=results.find(r=>r.kind==='relational'&&r.complete);
assert.equal(completeMapping.fields.length,s.columns.length);
assert.equal(completeChen.attributes.length+s.relationships.length,s.columns.length,'Every non-FK column is an oval, every FK is represented by a relationship');
for(const kind of ['chen','relational']){
  const moduleTables=results.filter(r=>r.kind===kind&&!r.complete).flatMap(r=>r.tables);
  assert.deepEqual(moduleTables.sort(),[...tables].sort());
  const moduleFks=results.filter(r=>r.kind===kind&&!r.complete).flatMap(r=>r.foreignKeys);
  assert.deepEqual(moduleFks.sort(),s.relationships.map(r=>r.name).sort());
}
writeFileSync(resolve(base,'sources/chen-relational-manifest.json'),JSON.stringify({schemaHash:s.schemaHash,graphvizVersion:viz.graphvizVersion,modules,images:results,warnings},null,2)+'\n');
console.log(`VERIFIED: ${tables.length} tables, ${s.columns.length} relational cells, ${completeChen.attributes.length} Chen attribute ovals, ${s.relationships.length} relationship diamonds and FK arrows.`);
