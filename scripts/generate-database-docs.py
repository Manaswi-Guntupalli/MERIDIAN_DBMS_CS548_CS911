from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
schema=(root/'server/prisma/schema.prisma').read_text(encoding='utf-8')
models=re.findall(r'model (\w+) \{(.*?)\n\}',schema,re.S)
names={name for name,_ in models}
lines=['# Relational schema and data dictionary','','Generated from `server/prisma/schema.prisma`. SQL constraints, policies and vector data are defined in `database/advanced.sql`. All identifiers use the quoted spelling shown below.','','```mermaid','erDiagram']
dictionary=[]
for name,body in models:
    foreign_keys={field.strip() for fields in re.findall(r'fields:\s*\[([^]]+)\]',body) for field in fields.split(',')}
    lines.append('  '+name+' {')
    dictionary+=['',f'## {name}','','| Column | Type | Nullability / keys / defaults |','| --- | --- | --- |']
    for raw in body.splitlines():
        raw=raw.split('//')[0].strip()
        if not raw:continue
        if raw.startswith('@@'):
            dictionary+=['',f'Constraint: `{raw}`','']
            continue
        match=re.match(r'(\w+)\s+(\w+)(\[\]|\?)?(.*)',raw)
        if not match:continue
        col,typ,suffix,attrs=match.groups()
        if typ in names:
            fields=re.search(r'fields:\s*\[([^]]+)\]',attrs)
            if fields:lines.append(f'  {typ} ||--o{{ {name} : "{fields[1]}"') if False else None
            continue
        key=' PK' if '@id' in attrs else (' FK' if col in foreign_keys else (' UK' if '@unique' in attrs else ''))
        lines.append(f'    {typ} {col}{key}')
        dictionary.append(f'| {col} | {typ}{suffix or ""} | {"nullable" if suffix=="?" else "required"} {"FOREIGN KEY; " if col in foreign_keys else ""}{attrs.strip()} |')
    lines.append('  }')
for name,body in models:
    for raw in body.splitlines():
        m=re.match(r'\s*(\w+)\s+(\w+)(\?)?\s+.*@relation\(.*fields:\s*\[([^]]+)\]',raw)
        if m and m[2] in names:
            parent='|o' if m[3] else '||'
            fields=[x.strip() for x in m[4].split(',')]
            unique=len(fields)==1 and bool(re.search(r'^\s*'+re.escape(fields[0])+r'\s+[^\n]*@unique',body,re.M))
            child='o|' if unique else 'o{'
            lines.append(f'  {m[2]} {parent}--{child} {name} : "{m[4]}"')
lines+=['  School ||--o{ KnowledgeItem : schoolId','  User ||--o{ KnowledgeItem : createdBy','  KnowledgeItem {','    text id PK','    text schoolId FK','    text title','    text content','    text category','    text sourceId','    text createdBy FK','    vector384 embedding','    text model','    integer revision','    timestamptz createdAt','    timestamptz updatedAt','  }','  KnowledgeRevision {','    bigint id PK','    text itemId','    text schoolId','    text operation','    text actorId','    integer revision','    timestamptz changedAt','  }','```','','The full ER diagram above includes every Prisma model. Optional foreign keys permit zero or one parent; unique and composite constraints in the dictionary determine one-to-one relationships.','']
lines+=dictionary
lines+=['','## KnowledgeItem (vector collection)','','Primary key: id (UUID text). Foreign keys: schoolId → School.id, createdBy → User.id. Required title, content, category, model, embedding, revision, timestamps. Optional sourceId records the imported document/notice. Category is POLICY/NOTICE/DOCUMENT. Embeddings are 384-dimensional normalized sentence vectors. HNSW uses cosine distance; B-tree filters by school/category; GIN supports full-text queries. RLS filters school and live account role.','','## KnowledgeRevision','','Append-only trigger audit: id BIGSERIAL PK; itemId, schoolId, operation, actorId, revision, changedAt. itemId intentionally has no foreign key so delete history survives deletion. Source IDs are provenance references rather than cascading foreign keys because document and notification sources are different tables.','','## Normalization','','Core entities separate users, students, teachers, classes, fees and payments. StudentParent and ClassSubjectPlan represent many-to-many relationships. TimetableSlot resolves timetable/class/teacher/subject/room assignments. Payment rows are independent facts; Fee.paid is a maintained summary updated with its payment inside one locked SQL function. Existing serialized extraction/engine payloads retain their original format for compatibility.']
(root/'docs/dbms').mkdir(parents=True,exist_ok=True)
(root/'docs/dbms/SCHEMA.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(f'Documented {len(models)} relational models plus vector and audit tables')
readme=root/'README.md'
text=readme.read_text(encoding='utf-8').replace('React + Vite web','Next.js web').replace('Prisma + SQLite/Postgres','PostgreSQL + pgvector').replace('React + TypeScript + Vite','Next.js + TypeScript')
readme.write_text(text,encoding='utf-8')
