// Rebuild standalone SQL files from the real schema and genuine embedding fixtures.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const base = fileURLToPath(new URL('../', import.meta.url));
const vectors = JSON.parse(readFileSync(resolve(base, 'fixtures/knowledge-embeddings.json'), 'utf8'));
const quote = x => "'" + String(x).replaceAll("'", "''") + "'";
const vector = x => quote('[' + x.join(',') + ']') + '::vector';
const school = `(SELECT id FROM public."School" WHERE code = 'MERIDIAN')`;
const context = `
-- Resolve real IDs at execution time; no installation-specific IDs or passwords.
CREATE TEMP TABLE rubric_context ON COMMIT DROP AS
SELECT s.id AS school_id,
  (SELECT id FROM public."User" WHERE "schoolId"=s.id AND role='ADMIN' AND active AND NOT "mustChangePassword" ORDER BY email LIMIT 1) AS admin_id,
  (SELECT id FROM public."User" WHERE "schoolId"=s.id AND role='TEACHER' AND active AND NOT "mustChangePassword" ORDER BY email LIMIT 1) AS teacher_user_id,
  (SELECT id FROM public."User" WHERE "schoolId"=s.id AND role='STUDENT' AND active AND NOT "mustChangePassword" ORDER BY email LIMIT 1) AS student_user_id,
  (SELECT id FROM public."Student" WHERE "schoolId"=s.id AND "classId" IS NOT NULL ORDER BY "admissionNo",id LIMIT 1) AS student_id
FROM public."School" s WHERE s.code='MERIDIAN';
DO $$ BEGIN
  IF (SELECT count(*) FROM rubric_context) <> 1 OR EXISTS (
    SELECT 1 FROM rubric_context WHERE admin_id IS NULL OR teacher_user_id IS NULL OR student_user_id IS NULL OR student_id IS NULL
  ) THEN RAISE EXCEPTION 'Seeded MERIDIAN school, admin, teacher and student are required'; END IF;
END $$;`;
const expectError = `
-- A failed statement is isolated in a PL/pgSQL subtransaction, so the demo can continue.
-- Unexpected success or a different SQLSTATE fails the example.
CREATE FUNCTION pg_temp.expect_error(command text, expected_state text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE actual_state text;
BEGIN
  BEGIN
    EXECUTE command;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
    IF actual_state <> expected_state THEN RAISE; END IF;
    RETURN actual_state;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE %, but the statement succeeded', expected_state;
END $$;`;
const studentFixture = `
-- This is a demo row in the ACTUAL Student table; ROLLBACK removes it.
INSERT INTO public."Student" (id,"schoolId","admissionNo","rollNo",name,"classId","updatedAt")
SELECT 'rubric_demo_student',x.school_id,'RUBRIC-DEMO-ONLY',999,'Rubric Demo Student',s."classId",TIMESTAMP '2026-11-10 00:00:00'
FROM rubric_context x JOIN public."Student" s ON s.id=x.student_id;`;
const feeFixture = `
-- Demo fee for an existing student. No existing fee or payment is changed.
INSERT INTO public."Fee" (id,"schoolId","studentId",title,amount,paid,"dueDate",status)
SELECT 'rubric_demo_fee',school_id,student_id,'Rubric demonstration fee',1000.00,0.00,'2026-12-01','PENDING'
FROM rubric_context;`;
const actor = role => `
DO $$ BEGIN
  PERFORM set_config('meridian.school_id',(SELECT school_id FROM rubric_context),true);
  PERFORM set_config('meridian.user_id',(SELECT ${role} FROM rubric_context),true);
END $$;
SET LOCAL ROLE meridian_knowledge;`;
const knowledgeFixture = `
-- Genuine MiniLM vectors generated from title + newline + content, as in the app.
-- Restrict demo searches to these six rows; never change the existing library.
DO $$ BEGIN
  PERFORM set_config('meridian.school_id',(SELECT school_id FROM rubric_context),true);
  PERFORM set_config('meridian.user_id',(SELECT admin_id FROM rubric_context),true);
END $$;
INSERT INTO public."KnowledgeItem" (id,"schoolId",title,content,category,"createdBy",embedding)
SELECT v.id,x.school_id,v.title,v.content,v.category,x.admin_id,v.embedding
FROM rubric_context x CROSS JOIN (VALUES
${vectors.items.map(item => `  (${quote('rubric_demo_knowledge_' + item.key)},${quote(item.title)},${quote(item.content)},${quote(item.category)},${vector(item.embedding)})`).join(',\n')}
) AS v(id,title,content,category,embedding);`;
const roster = `
-- PostgreSQL FKs must connect tables with the same persistence type.
-- This real table references real School/Student keys and disappears at ROLLBACK.
CREATE TABLE rubric_roster (
  student_id text PRIMARY KEY REFERENCES public."Student"(id),
  school_id text NOT NULL REFERENCES public."School"(id),
  admission_no text UNIQUE NOT NULL,
  student_name text NOT NULL,
  roll_no integer NOT NULL CHECK (roll_no > 0)
);
INSERT INTO rubric_roster
SELECT id,"schoolId","admissionNo",name,"rollNo" FROM public."Student"
WHERE "schoolId"=${school} ORDER BY "admissionNo",id LIMIT 6;`;
const items = [];
function add(group, name, title, concepts, mode, sql) {
  sql = sql.replaceAll('pg_temp.rubric_roster','public.rubric_demo_roster')
    .replaceAll(/\brubric_roster\b/g,'public.rubric_demo_roster');
  const file = `${group}/${name}.sql`;
  const body = `-- ${title}\n-- Concepts: ${concepts}\n-- Data: ${mode}\n-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.\n-- Run the WHOLE file. It is standalone; no earlier example is required.\n-- Result tables: ${name}.expected.md in this directory.\n-- All persistent-table writes and DDL are rolled back.\n\nBEGIN;\nSET LOCAL statement_timeout = '20s';\nSET LOCAL lock_timeout = '3s';\nSET LOCAL TIME ZONE 'UTC';\n${sql.trim()}\n\nROLLBACK;\n`;
  const target = resolve(base, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body);
  items.push({ file, title, concepts, data: mode });
}

// 00: prove that the examples match the installed database, not just a diagram.
add('00_design_and_schema','01_tables','List all actual application tables','Relational schema; entities','Existing schema',`
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT LIKE '\\_%'
ORDER BY table_name;`);
add('00_design_and_schema','02_columns','Inspect important table columns','Attributes; types; nullability; vector dimensions','Existing schema',`
SELECT c.table_name,c.column_name,pg_catalog.format_type(a.atttypid,a.atttypmod) AS data_type,c.is_nullable
FROM information_schema.columns c
JOIN pg_namespace n ON n.nspname=c.table_schema
JOIN pg_class t ON t.relnamespace=n.oid AND t.relname=c.table_name
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attname=c.column_name
WHERE c.table_schema='public' AND c.table_name IN ('Student','Fee','KnowledgeItem')
ORDER BY c.table_name,c.ordinal_position;`);
add('00_design_and_schema','03_primary_and_unique_keys','Show installed primary and unique keys','PRIMARY KEY; UNIQUE; composite keys','Existing schema',`
SELECT r.relname AS table_name,idx.relname AS key_name,
CASE WHEN i.indisprimary THEN 'PRIMARY KEY' ELSE 'UNIQUE INDEX' END AS key_type,
pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i JOIN pg_class r ON r.oid=i.indrelid JOIN pg_class idx ON idx.oid=i.indexrelid
WHERE r.relnamespace='public'::regnamespace AND i.indisunique
AND r.relname IN ('Student','Class','Fee','Attendance','AttendanceVerification','KnowledgeItem')
ORDER BY r.relname,idx.relname;`);
add('00_design_and_schema','04_foreign_keys','Show actual table relationships','FOREIGN KEY; referential integrity','Existing schema',`
SELECT r.relname AS table_name,c.conname AS constraint_name,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
WHERE c.connamespace='public'::regnamespace AND c.contype='f'
AND r.relname IN ('Student','StudentParent','Fee','Payment','TimetableSlot','KnowledgeItem')
ORDER BY r.relname,c.conname;`);
add('00_design_and_schema','05_check_constraints','Show actual validation rules','CHECK; monetary integrity; mandatory QR and face','Existing schema',`
SELECT r.relname AS table_name,c.conname AS constraint_name,c.convalidated AS validated_for_historical_rows,
pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
WHERE c.connamespace='public'::regnamespace AND c.contype='c'
AND r.relname IN ('Student','User','Fee','Payment','KnowledgeItem','AttendanceSession','AttendanceVerification')
ORDER BY r.relname,c.conname;`);
add('00_design_and_schema','06_indexes_and_view','Inspect the installed indexes and fee view','B-tree; GIN; HNSW; partial unique index; view','Existing schema',`
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'
AND (tablename='KnowledgeItem' OR indexname IN ('fee_school_due','one_live_timetable'))
ORDER BY tablename,indexname;
SELECT viewname,definition FROM pg_views WHERE schemaname='public' AND viewname='school_fee_summary';`);

// 01: DDL affects only a new demonstration roster and is transactionally reversed.
add('01_ddl','01_create_table','Create a roster with real student and school references','CREATE TABLE; PK; FK; UNIQUE; NOT NULL; CHECK','New rollback-only table populated from existing Student rows',`${roster}
SELECT admission_no,student_name,roll_no FROM rubric_roster ORDER BY admission_no;`);
add('01_ddl','02_alter_table','Add a validated column to the demonstration roster','ALTER TABLE; DEFAULT; CHECK','New rollback-only roster populated from existing Student rows',`${roster}
ALTER TABLE rubric_roster ADD COLUMN participation_score integer NOT NULL DEFAULT 0;
ALTER TABLE rubric_roster ADD CONSTRAINT rubric_score_range CHECK (participation_score BETWEEN 0 AND 10);
SELECT admission_no,student_name,participation_score FROM rubric_roster ORDER BY admission_no;`);
add('01_ddl','03_drop_table','Drop only the demonstration roster','DROP TABLE; object lifecycle','New demonstration table only; existing school tables remain intact',`${roster}
SELECT count(*)::integer AS rows_before_drop FROM rubric_roster;
DROP TABLE rubric_roster;
SELECT to_regclass('pg_temp.rubric_roster') IS NULL AS demo_table_dropped,
       to_regclass('public."Student"') IS NOT NULL AS actual_student_table_exists;`);
add('01_ddl','04_constraints','Execute failing PK, FK, CHECK and NOT NULL cases','Database validation; expected SQLSTATE errors','New rollback-only table with FKs to real Student and School',`${roster}
${expectError}
SELECT 'PRIMARY KEY duplicate' AS test,pg_temp.expect_error(
  'INSERT INTO rubric_roster SELECT student_id,school_id,admission_no||''-duplicate'',student_name,roll_no FROM rubric_roster ORDER BY admission_no LIMIT 1','23505') AS sqlstate
UNION ALL SELECT 'FOREIGN KEY missing student',pg_temp.expect_error(
  'INSERT INTO rubric_roster VALUES (''rubric_missing_student'',(SELECT id FROM public."School" WHERE code=''MERIDIAN''),''DEMO-MISSING'',''Missing student'',1)','23503')
UNION ALL SELECT 'CHECK nonpositive roll',pg_temp.expect_error('UPDATE rubric_roster SET roll_no=0','23514')
UNION ALL SELECT 'NOT NULL student name',pg_temp.expect_error('UPDATE rubric_roster SET student_name=NULL','23502')
ORDER BY test;`);
add('01_ddl','05_create_index','Create and inspect a B-tree index','CREATE INDEX; index metadata','Rollback-only roster index; also inspect installed live indexes',`${roster}
CREATE INDEX rubric_roster_school_roll ON rubric_roster(school_id,roll_no);
SELECT c.relname AS index_name,a.amname AS index_method,i.indisunique AS is_unique
FROM pg_class c JOIN pg_index i ON i.indexrelid=c.oid JOIN pg_am a ON a.oid=c.relam
WHERE i.indrelid='public.rubric_demo_roster'::regclass ORDER BY c.relname;
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='KnowledgeItem' ORDER BY indexname;`);
add('01_ddl','06_create_view','Create a class-enrolment view over actual tables','CREATE VIEW; LEFT JOIN; GROUP BY','Temporary view over existing Class and Student tables',`
CREATE TEMP VIEW rubric_class_enrolment AS
SELECT c.name AS class_name,count(s.id)::integer AS students
FROM public."Class" c LEFT JOIN public."Student" s ON s."classId"=c.id AND s."schoolId"=c."schoolId"
WHERE c."schoolId"=${school} GROUP BY c.id,c.name;
SELECT * FROM rubric_class_enrolment ORDER BY class_name;`);

// 02: INSERT/UPDATE/DELETE use clearly marked demo rows in the real tables.
add('02_dml','01_select','Read six real students and their classes','SELECT; WHERE; ORDER BY; LIMIT','Existing Student and Class rows',`
SELECT s."admissionNo",s.name,c.name AS class_name
FROM public."Student" s LEFT JOIN public."Class" c ON c.id=s."classId" AND c."schoolId"=s."schoolId"
WHERE s."schoolId"=${school} ORDER BY s."admissionNo",s.id LIMIT 6;`);
add('02_dml','02_insert','Insert a demonstration student into the actual table','INSERT; SELECT; RETURNING','One demo Student row in the existing school and class',`${context}
INSERT INTO public."Student" (id,"schoolId","admissionNo","rollNo",name,"classId","updatedAt")
SELECT 'rubric_demo_student',x.school_id,'RUBRIC-DEMO-ONLY',999,'Rubric Demo Student',s."classId",TIMESTAMP '2026-11-10 00:00:00'
FROM rubric_context x JOIN public."Student" s ON s.id=x.student_id
RETURNING "admissionNo",name,"rollNo",active;`);
add('02_dml','03_update','Update only the demonstration student','UPDATE; WHERE; RETURNING','One demo Student row; existing student records untouched',`${context}${studentFixture}
SELECT "admissionNo",name AS before_name FROM public."Student" WHERE id='rubric_demo_student';
UPDATE public."Student" SET name='Rubric Demo Student Reviewed',"updatedAt"=TIMESTAMP '2026-11-10 00:00:00'
WHERE id='rubric_demo_student' RETURNING "admissionNo",name AS after_name;`);
add('02_dml','04_delete','Delete only the demonstration student','DELETE; RETURNING; count','One demo Student row; existing student records untouched',`${context}${studentFixture}
DELETE FROM public."Student" WHERE id='rubric_demo_student' RETURNING "admissionNo",name;
SELECT count(*)::integer AS demo_rows_remaining FROM public."Student" WHERE id='rubric_demo_student';`);
add('02_dml','05_upsert','Upsert a demonstration subject using the installed unique key','INSERT ON CONFLICT DO UPDATE; composite UNIQUE','One demo Subject row; rolled back',`${context}
INSERT INTO public."Subject" (id,"schoolId",code,name) SELECT 'rubric_demo_subject',school_id,'RUBRIC-DEMO','Demo subject' FROM rubric_context
RETURNING code,name;
INSERT INTO public."Subject" (id,"schoolId",code,name) SELECT 'rubric_demo_subject',school_id,'RUBRIC-DEMO','Updated demo subject' FROM rubric_context
ON CONFLICT ("schoolId",code) DO UPDATE SET name=EXCLUDED.name
RETURNING code,name;`);
add('02_dml','06_insert_select','Create six demo fees for existing students','INSERT SELECT; JOIN; ORDER BY','Six demo Fee rows related to real students; rolled back',`
INSERT INTO public."Fee" (id,"schoolId","studentId",title,amount,paid,"dueDate",status)
SELECT 'rubric_demo_bulk_'||s."admissionNo",s."schoolId",s.id,'Rubric field trip',150.00,0.00,'2026-12-01','PENDING'
FROM public."Student" s WHERE s."schoolId"=${school} ORDER BY s."admissionNo",s.id LIMIT 6;
SELECT s."admissionNo",s.name,f.title,f.amount,f.paid FROM public."Fee" f JOIN public."Student" s ON s.id=f."studentId"
WHERE f.id LIKE 'rubric_demo_bulk_%' ORDER BY s."admissionNo";`);

// 03: meaningful queries on the existing records (no fabricated output).
add('03_joins_and_aggregates','01_inner_join','Join actual students to their class teachers','INNER JOIN; multiple relationships','Existing Student, Class, Teacher and User rows',`
SELECT s."admissionNo",s.name AS student,c.name AS class_name,u.name AS class_teacher
FROM public."Student" s JOIN public."Class" c ON c.id=s."classId" AND c."schoolId"=s."schoolId"
JOIN public."Teacher" t ON t.id=c."classTeacherId" JOIN public."User" u ON u.id=t."userId"
WHERE s."schoolId"=${school} ORDER BY s."admissionNo",s.id LIMIT 6;`);
add('03_joins_and_aggregates','02_left_join','Keep every class when counting active students','LEFT JOIN; COUNT; GROUP BY','Existing Class and Student rows',`
SELECT c.name AS class_name,count(s.id)::integer AS active_students
FROM public."Class" c LEFT JOIN public."Student" s ON s."classId"=c.id AND s."schoolId"=c."schoolId" AND s.active
WHERE c."schoolId"=${school} GROUP BY c.id,c.name,c.grade,c.section ORDER BY c.grade,c.section;`);
add('03_joins_and_aggregates','03_timetable_join','Read the published 7A timetable with teachers and rooms','Six-table JOIN; LEFT JOIN; ORDER BY','Existing published timetable; first six slots for class 7A',`
SELECT c.name AS class_name,sl.day+1 AS weekday_number,sl.period+1 AS period_number,
sub.name AS subject,u.name AS teacher,coalesce(r.name,'Unassigned') AS room
FROM public."Timetable" tt JOIN public."TimetableSlot" sl ON sl."timetableId"=tt.id
JOIN public."Class" c ON c.id=sl."classId" JOIN public."Subject" sub ON sub.id=sl."subjectId"
JOIN public."Teacher" te ON te.id=sl."teacherId" JOIN public."User" u ON u.id=te."userId"
LEFT JOIN public."Room" r ON r.id=sl."roomId"
WHERE tt."schoolId"=${school} AND tt.active AND tt.status='PUBLISHED' AND c.name='7A'
ORDER BY sl.day,sl.period,sl.id LIMIT 6;`);
add('03_joins_and_aggregates','04_group_by_having','Find classes with outstanding fees','JOIN; GROUP BY; HAVING; SUM; COUNT DISTINCT','Existing Student, Class and Fee rows; unpaid totals per class',`
SELECT c.name AS class_name,count(DISTINCT s.id)::integer AS students_with_fees,
sum(f.amount-f.paid)::numeric(12,2) AS outstanding
FROM public."Class" c JOIN public."Student" s ON s."classId"=c.id AND s."schoolId"=c."schoolId"
JOIN public."Fee" f ON f."studentId"=s.id AND f."schoolId"=s."schoolId"
WHERE c."schoolId"=${school} GROUP BY c.id,c.name
HAVING sum(f.amount-f.paid)>0 ORDER BY outstanding DESC,c.name;`);
add('03_joins_and_aggregates','05_aggregate_functions','Compare existing fee categories','COUNT; SUM; AVG; MIN; MAX; GROUP BY','Existing Fee rows; money kept as exact numeric',`
SELECT title,count(*)::integer AS accounts,sum(amount)::numeric(12,2) AS billed,
sum(paid)::numeric(12,2) AS collected,round(avg(amount),2) AS average_fee,min(amount) AS minimum_fee,max(amount) AS maximum_fee
FROM public."Fee" WHERE "schoolId"=${school} GROUP BY title ORDER BY title;`);
add('03_joins_and_aggregates','06_order_and_conditional_aggregation','Rank students by recorded attendance','FILTER; conditional aggregation; NULLIF; ORDER BY','Existing daily Attendance records; PRESENT and LATE count as attended',`
SELECT s."admissionNo",s.name,count(a.id)::integer AS recorded,
count(a.id) FILTER (WHERE a.status IN ('PRESENT','LATE'))::integer AS attended,
round(100.0*count(a.id) FILTER (WHERE a.status IN ('PRESENT','LATE'))/nullif(count(a.id),0),2) AS attendance_percent
FROM public."Student" s LEFT JOIN public."Attendance" a ON a."studentId"=s.id AND a."schoolId"=s."schoolId"
WHERE s."schoolId"=${school} GROUP BY s.id,s."admissionNo",s.name
ORDER BY attendance_percent DESC NULLS LAST,s."admissionNo",s.id LIMIT 6;`);

// 04: nested/correlated queries, CTE and recursive CTE from the rubric.
add('04_subqueries_and_ctes','01_nested_subquery','Find fee accounts above the school average','Nested scalar subquery; AVG','Existing Fee and Student rows',`
SELECT s."admissionNo",s.name,f.title,f.amount
FROM public."Fee" f JOIN public."Student" s ON s.id=f."studentId"
WHERE f."schoolId"=${school} AND f.amount>(SELECT avg(amount) FROM public."Fee" WHERE "schoolId"=${school})
ORDER BY f.amount DESC,s."admissionNo",f.title,f.id LIMIT 6;`);
add('04_subqueries_and_ctes','02_correlated_exists','Find students with at least one unpaid fee','Correlated EXISTS','Existing Student and Fee rows',`
SELECT s."admissionNo",s.name FROM public."Student" s
WHERE s."schoolId"=${school} AND EXISTS (
  SELECT 1 FROM public."Fee" f WHERE f."studentId"=s.id AND f."schoolId"=s."schoolId" AND f.paid<f.amount
) ORDER BY s."admissionNo",s.id LIMIT 6;`);
add('04_subqueries_and_ctes','03_correlated_scalar','Calculate the balance for each of six students','Correlated scalar subquery; COALESCE; SUM','Existing Student and Fee rows',`
SELECT s."admissionNo",s.name,
coalesce((SELECT sum(f.amount-f.paid) FROM public."Fee" f WHERE f."studentId"=s.id AND f."schoolId"=s."schoolId"),0)::numeric(12,2) AS outstanding
FROM public."Student" s WHERE s."schoolId"=${school} ORDER BY s."admissionNo",s.id LIMIT 6;`);
add('04_subqueries_and_ctes','04_not_exists','Find students with no unpaid fee accounts','NOT EXISTS; anti-join','Existing students; includes students with no fee accounts, if any',`
SELECT s."admissionNo",s.name FROM public."Student" s
WHERE s."schoolId"=${school} AND NOT EXISTS (
  SELECT 1 FROM public."Fee" f WHERE f."studentId"=s.id AND f."schoolId"=s."schoolId" AND f.paid<f.amount
) ORDER BY s."admissionNo",s.id LIMIT 6;`);
add('04_subqueries_and_ctes','05_cte','Build attendance summaries before joining students','WITH CTE; aggregation; LEFT JOIN','Existing Attendance and Student rows',`
WITH counts AS (
  SELECT "studentId",count(*) AS recorded,count(*) FILTER (WHERE status IN ('PRESENT','LATE')) AS attended
  FROM public."Attendance" WHERE "schoolId"=${school} GROUP BY "studentId"
)
SELECT s."admissionNo",s.name,coalesce(c.recorded,0)::integer AS recorded,
round(100.0*c.attended/nullif(c.recorded,0),2) AS attendance_percent
FROM public."Student" s LEFT JOIN counts c ON c."studentId"=s.id
WHERE s."schoolId"=${school} ORDER BY s."admissionNo",s.id LIMIT 6;`);
add('04_subqueries_and_ctes','06_recursive_cte','Fill the final seven recorded attendance dates','WITH RECURSIVE; date series; LEFT JOIN','Existing attendance; anchored to last recorded date rather than the clock',`
WITH RECURSIVE last_day AS (
 SELECT max(date)::date AS day FROM public."Attendance" WHERE "schoolId"=${school}
), days(day) AS (
 SELECT day-6 FROM last_day WHERE day IS NOT NULL
 UNION ALL SELECT d.day+1 FROM days d CROSS JOIN last_day l WHERE d.day<l.day
)
SELECT d.day::text AS date,count(a.id)::integer AS recorded,
count(a.id) FILTER (WHERE a.status IN ('PRESENT','LATE'))::integer AS attended
FROM days d LEFT JOIN public."Attendance" a ON a.date=d.day::text AND a."schoolId"=${school}
GROUP BY d.day ORDER BY d.day;`);

// 05: six advanced executable examples, in addition to indexes/views/CTEs above.
add('05_advanced_sql','01_stored_payment_function','Call the actual atomic fee-payment function','Stored PL/pgSQL function; row locking; atomic payment','One demo Fee and Payment linked to an existing student',`${context}${feeFixture}
SELECT * FROM public.record_fee_payment('rubric_demo_fee',(SELECT school_id FROM rubric_context),250.00::numeric,'CASH','RUBRIC-DEMO','rubric_demo_payment');
SELECT f.title,f.amount,f.paid,f.amount-f.paid AS outstanding,f.status,count(p.id)::integer AS payment_rows
FROM public."Fee" f LEFT JOIN public."Payment" p ON p."feeId"=f.id WHERE f.id='rubric_demo_fee' GROUP BY f.id;`);
add('05_advanced_sql','02_stored_procedure','Create and call a transaction-local payment procedure','CREATE PROCEDURE; CALL; reuse installed payment function','Temporary procedure calls real function on one demo Fee',`${context}${feeFixture}
CREATE PROCEDURE pg_temp.rubric_pay_demo(p_amount numeric)
LANGUAGE plpgsql AS $$ BEGIN
  PERFORM * FROM public.record_fee_payment('rubric_demo_fee',(SELECT school_id FROM rubric_context),p_amount,'CASH','RUBRIC-DEMO','rubric_demo_payment');
END $$;
CALL pg_temp.rubric_pay_demo(1000.00);
SELECT title,amount,paid,status FROM public."Fee" WHERE id='rubric_demo_fee';`);
add('05_advanced_sql','03_trigger_audit','Exercise the actual knowledge audit trigger','BEFORE trigger; revision counter; INSERT UPDATE DELETE audit','Six genuine-vector demo entries in actual KnowledgeItem; all rolled back',`${context}${knowledgeFixture}
UPDATE public."KnowledgeItem" SET title='Reporting student absence - reviewed' WHERE id='rubric_demo_knowledge_absence';
DELETE FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence';
SELECT operation,revision,("actorId"=(SELECT admin_id FROM rubric_context)) AS correct_actor
FROM public."KnowledgeRevision" WHERE "itemId"='rubric_demo_knowledge_absence' ORDER BY id;
SELECT count(*)::integer AS deleted_item_remaining FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence';`);
add('05_advanced_sql','04_transaction_rollback','Roll back a payment with a savepoint','BEGIN; SAVEPOINT; ROLLBACK TO; atomicity','One demo fee; payment and balance both reversed',`${context}${feeFixture}
SAVEPOINT before_payment;
SELECT * FROM public.record_fee_payment('rubric_demo_fee',(SELECT school_id FROM rubric_context),250.00::numeric,'CASH','RUBRIC-DEMO','rubric_demo_payment');
ROLLBACK TO SAVEPOINT before_payment;
SELECT amount,paid,status,(SELECT count(*)::integer FROM public."Payment" WHERE "feeId"='rubric_demo_fee') AS payment_rows
FROM public."Fee" WHERE id='rubric_demo_fee';`);
add('05_advanced_sql','05_validation_and_failed_payment','Verify function validation and reject overpayment','Stored functions; SQLSTATE; failed statement atomicity','One demo Fee; real calendar validator and payment function',`${context}${feeFixture}${expectError}
SELECT d AS input,public.valid_calendar_date(d) AS valid FROM (VALUES ('2026-02-28'),('2026-02-30'),('not-a-date')) AS dates(d) ORDER BY d;
SELECT pg_temp.expect_error(format('SELECT * FROM public.record_fee_payment(%L,%L,1200.00::numeric,%L,NULL,%L)',
'rubric_demo_fee',(SELECT school_id FROM rubric_context),'CASH','rubric_demo_payment'),'P0001') AS overpayment_sqlstate;
SELECT paid,status,(SELECT count(*)::integer FROM public."Payment" WHERE "feeId"='rubric_demo_fee') AS payment_rows FROM public."Fee" WHERE id='rubric_demo_fee';`);
add('05_advanced_sql','06_full_text_search','Search policy text using PostgreSQL full-text search','to_tsvector; plainto_tsquery; ts_rank; GIN-compatible expression','Genuine-vector demo entries in actual KnowledgeItem',`${context}${knowledgeFixture}
SELECT title,category,round(ts_rank(to_tsvector('english',title||' '||content),plainto_tsquery('english','absence teacher'))::numeric,6) AS lexical_rank
FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%'
AND to_tsvector('english',title||' '||content) @@ plainto_tsquery('english','absence teacher')
ORDER BY lexical_rank DESC,title;`);

// 06: pgvector creation and complete C/R/U/D on actual KnowledgeItem rows.
add('06_pgvector','01_vector_creation','Verify pgvector creation and native storage','CREATE EXTENSION; vector(384); HNSW; model metadata','Installed extension/table plus a temporary vector table',`
CREATE EXTENSION IF NOT EXISTS vector;
-- Same native table definition as the installed application. IF NOT EXISTS
-- leaves the existing table intact; it is not a replacement or migration.
CREATE TABLE IF NOT EXISTS public."KnowledgeItem" (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES public."School"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 20 AND 12000),
  category text NOT NULL CHECK (category IN ('POLICY','NOTICE','DOCUMENT')),
  "sourceId" text,
  "createdBy" text NOT NULL REFERENCES public."User"(id),
  model text NOT NULL DEFAULT 'Xenova/all-MiniLM-L6-v2' CHECK (model='Xenova/all-MiniLM-L6-v2'),
  embedding vector(384) NOT NULL CHECK (vector_norm(embedding)>0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_embedding_hnsw ON public."KnowledgeItem" USING hnsw (embedding vector_cosine_ops);
CREATE TEMP TABLE rubric_vector_shape(id integer PRIMARY KEY,embedding vector(384) NOT NULL) ON COMMIT DROP;
SELECT extname,extversion FROM pg_extension WHERE extname='vector';
SELECT c.relname AS table_name,format_type(a.atttypid,a.atttypmod) AS embedding_type
FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid WHERE c.oid='public."KnowledgeItem"'::regclass AND a.attname='embedding';
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='knowledge_embedding_hnsw';`);
add('06_pgvector','02_vector_insert','Insert six genuine sentence embeddings','Vector create; real MiniLM model; dimensions; norm','Six demo KnowledgeItem rows; actual school/admin; rolled back',`${context}${knowledgeFixture}
SELECT title,category,model,vector_dims(embedding) AS dimensions,round(vector_norm(embedding)::numeric,4) AS norm
FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%' ORDER BY title;`);
add('06_pgvector','03_vector_similarity_search','Retrieve policy text by meaning','Cosine distance <=>; similarity 1-distance; ORDER BY; LIMIT','Genuine query embedding and six genuine stored text embeddings',`${context}${knowledgeFixture}
-- Query text: ${vectors.query.text}
SELECT title,category,round((1-(embedding <=> ${vector(vectors.query.embedding)}))::numeric,6) AS cosine_similarity
FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%'
ORDER BY embedding <=> ${vector(vectors.query.embedding)},title LIMIT 6;`);
add('06_pgvector','04_vector_update','Update policy text with a newly computed embedding','Vector UPDATE; re-embedding; trigger revision','One demo entry updated with a genuine embedding for the revised text',`${context}${knowledgeFixture}
UPDATE public."KnowledgeItem" SET title=${quote(vectors.updated.title)},content=${quote(vectors.updated.content)},embedding=${vector(vectors.updated.embedding)}
WHERE id='rubric_demo_knowledge_absence'
RETURNING title,revision,vector_dims(embedding) AS dimensions;
SELECT round((1-(embedding <=> ${vector(vectors.updated.embedding)}))::numeric,6) AS similarity_to_updated_embedding
FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence';`);
add('06_pgvector','05_vector_delete','Delete a vector entry and retain audit history','Vector DELETE; RETURNING; audit persistence','One demo entry deleted; all demo operations rolled back',`${context}${knowledgeFixture}
DELETE FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence' RETURNING title,category;
SELECT count(*)::integer AS remaining_searchable_rows FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%';
SELECT operation,revision FROM public."KnowledgeRevision" WHERE "itemId"='rubric_demo_knowledge_absence' ORDER BY id;`);
add('06_pgvector','06_filtered_vector_read','Filter semantic results by category and school','Vector READ; metadata filter; GROUP BY; model provenance','Genuine demo entries; POLICY-only cosine ranking',`${context}${knowledgeFixture}
SELECT title,category,round((1-(embedding <=> ${vector(vectors.query.embedding)}))::numeric,6) AS cosine_similarity
FROM public."KnowledgeItem" WHERE "schoolId"=(SELECT school_id FROM rubric_context)
AND category='POLICY' AND id LIKE 'rubric_demo_knowledge_%'
ORDER BY embedding <=> ${vector(vectors.query.embedding)},title LIMIT 6;
SELECT category,count(*)::integer AS entries FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%' GROUP BY category ORDER BY category;`);

// 07: actual PostgreSQL role/RLS behavior and live-table integrity, not UI checks.
add('07_permissions_and_integrity','01_roles_grants_policies','Inspect database roles, grants and policies','Roles; GRANT; REVOKE; RLS policy catalogue; minimum two application roles','Existing roles/policies plus GRANT/REVOKE on a temporary roster view',`
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('meridian','meridian_knowledge') ORDER BY rolname;
SELECT privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='KnowledgeItem' AND grantee='meridian_knowledge' ORDER BY privilege_type;
SELECT policyname,cmd,roles::text FROM pg_policies WHERE schemaname='public' AND tablename='KnowledgeItem' ORDER BY policyname;
SELECT role,count(*)::integer AS accounts FROM public."User" WHERE "schoolId"=${school} GROUP BY role ORDER BY role;
-- Execute DCL on a demo view only; the application's existing grants remain unchanged.
CREATE TEMP VIEW rubric_permission_view AS SELECT "admissionNo",name FROM public."Student" WHERE "schoolId"=${school};
GRANT SELECT ON rubric_permission_view TO meridian_knowledge;
SELECT has_table_privilege('meridian_knowledge','pg_temp.rubric_permission_view','SELECT') AS can_select_after_grant;
REVOKE SELECT ON rubric_permission_view FROM meridian_knowledge;
SELECT has_table_privilege('meridian_knowledge','pg_temp.rubric_permission_view','SELECT') AS can_select_after_revoke;`);
add('07_permissions_and_integrity','02_admin_allowed','Prove the database allows administrator CRUD','SET LOCAL ROLE; RLS; administrator permission','Demo knowledge entry; actual admin identity read from User',`${context}${knowledgeFixture}${actor('admin_id')}
SELECT current_user AS database_role,public.meridian_actor_role() AS application_role;
INSERT INTO public."KnowledgeItem"(id,"schoolId",title,content,category,"createdBy",embedding)
SELECT 'rubric_demo_allowed',"schoolId",'Administrator created policy',content,category,current_setting('meridian.user_id'),embedding
FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence' RETURNING title,revision;
DELETE FROM public."KnowledgeItem" WHERE id='rubric_demo_allowed' RETURNING title;
UPDATE public."KnowledgeItem" SET title='Administrator reviewed absence policy' WHERE id='rubric_demo_knowledge_absence' RETURNING title,revision;
DELETE FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence' RETURNING title;
SELECT count(*)::integer AS remaining_demo_entries FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%';`);
add('07_permissions_and_integrity','03_teacher_read_only','Prove a teacher can read but cannot modify the library','Database RLS; teacher SELECT; UPDATE/DELETE zero rows; rejected INSERT','Demo knowledge rows; actual teacher identity',`${context}${knowledgeFixture}${expectError}${actor('teacher_user_id')}
SELECT current_user AS database_role,public.meridian_actor_role() AS application_role;
SELECT count(*)::integer AS visible_demo_entries FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%';
WITH changed AS (UPDATE public."KnowledgeItem" SET title='Unauthorized change' WHERE id='rubric_demo_knowledge_absence' RETURNING id)
SELECT count(*)::integer AS updated_rows FROM changed;
WITH deleted AS (DELETE FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence' RETURNING id)
SELECT count(*)::integer AS deleted_rows FROM deleted;
SELECT pg_temp.expect_error($sql$INSERT INTO public."KnowledgeItem"(id,"schoolId",title,content,category,"createdBy",embedding)
SELECT 'rubric_demo_denied',"schoolId",title,content,category,current_setting('meridian.user_id'),embedding
FROM public."KnowledgeItem" WHERE id='rubric_demo_knowledge_absence'$sql$,'42501') AS rejected_insert_sqlstate;`);
add('07_permissions_and_integrity','04_student_cannot_read','Prove students cannot read the staff library','Database RLS; student denied visibility','Demo knowledge rows; actual active student identity',`${context}${knowledgeFixture}${actor('student_user_id')}
SELECT public.meridian_actor_role() AS application_role;
SELECT count(*)::integer AS visible_demo_entries FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%';`);
add('07_permissions_and_integrity','05_wrong_school_context','Prove mismatched school context cannot read entries','Tenant isolation; trusted identity context; RLS','Demo entries remain in MERIDIAN; authenticated user school is deliberately mismatched',`${context}${knowledgeFixture}
DO $$ BEGIN
  PERFORM set_config('meridian.user_id',(SELECT admin_id FROM rubric_context),true);
  PERFORM set_config('meridian.school_id','rubric_demo_other_school',true);
END $$;
SET LOCAL ROLE meridian_knowledge;
SELECT public.meridian_actor_role() IS NULL AS mismatched_identity_rejected;
SELECT count(*)::integer AS visible_demo_entries FROM public."KnowledgeItem" WHERE id LIKE 'rubric_demo_knowledge_%';`);
add('07_permissions_and_integrity','06_database_validation','Test actual database-level monetary, calendar, role and attendance rules','CHECK constraints; immutable tenant; QR+face requirement; SQLSTATE','Demo fee/student/session/verification rows only; real constraints remain installed',`${context}${studentFixture}${feeFixture}${expectError}
CREATE TEMP TABLE rubric_integrity_results(test text PRIMARY KEY,sqlstate text NOT NULL) ON COMMIT DROP;
INSERT INTO rubric_integrity_results VALUES
('Fee cannot be negative',pg_temp.expect_error('UPDATE public."Fee" SET amount=-1 WHERE id=''rubric_demo_fee''','23514')),
('Fee cannot be overpaid',pg_temp.expect_error('UPDATE public."Fee" SET paid=1001 WHERE id=''rubric_demo_fee''','23514')),
('Student roll must be positive',pg_temp.expect_error('UPDATE public."Student" SET "rollNo"=0 WHERE id=''rubric_demo_student''','23514')),
('Fee due date must exist',pg_temp.expect_error('UPDATE public."Fee" SET "dueDate"=''2026-02-30'' WHERE id=''rubric_demo_fee''','23514'));
INSERT INTO public."AttendanceSession" (id,"schoolId","classId","teacherId",date,"expiryTime","sessionToken","verificationMode")
SELECT 'rubric_demo_session',x.school_id,s."classId",t.id,'2026-11-10',TIMESTAMP '2026-11-10 23:59:59','rubric_demo_token','QR_FACE'
FROM rubric_context x JOIN public."Student" s ON s.id=x.student_id JOIN public."Teacher" t ON t."userId"=x.teacher_user_id;
INSERT INTO rubric_integrity_results VALUES ('Active session must use QR_FACE',pg_temp.expect_error(
'UPDATE public."AttendanceSession" SET "verificationMode"=''QR_ONLY'' WHERE id=''rubric_demo_session''','23514'));
INSERT INTO public."AttendanceVerification"(id,"sessionId","studentId",state,"updatedAt")
SELECT 'rubric_demo_verification','rubric_demo_session',student_id,'PENDING',TIMESTAMP '2026-11-10 00:00:00' FROM rubric_context;
INSERT INTO rubric_integrity_results VALUES ('Present requires both QR and face proofs',pg_temp.expect_error(
'UPDATE public."AttendanceVerification" SET state=''PRESENT'' WHERE id=''rubric_demo_verification''','23514'));
SELECT test,sqlstate FROM rubric_integrity_results ORDER BY test;`);

if (items.length !== 48) throw new Error('Expected 48 examples');
writeFileSync(resolve(base, 'examples.json'), JSON.stringify({ schoolCode: 'MERIDIAN', examples: items }, null, 2) + '\n');
let index='# Complete SQL and expected-output index\n\n';
index+='Six standalone examples per category. Execute each complete SQL file on the actual website database and compare the adjacent captured result tables. [Run instructions](README.md) | [Verification](VERIFICATION.md) | [Six-example walkthrough](SIX_EXAMPLE_DEMO.md)\n\n';
for(const group of [...new Set(items.map(item=>item.file.split('/')[0]))]){
  index+=`## ${group}\n\n| Example | SQL file | Expected output |\n| --- | --- | --- |\n`;
  for(const item of items.filter(item=>item.file.startsWith(group+'/'))){
    index+=`| ${item.title} | [${item.file.split('/').at(-1)}](${item.file}) | [Result tables](${item.file.replace(/\.sql$/,'.expected.md')}) |\n`;
  }
  index+='\n';
}
writeFileSync(resolve(base,'INDEX.md'),index.trimEnd()+'\n');
console.log(`Wrote ${items.length} standalone SQL examples in eight categories.`);
