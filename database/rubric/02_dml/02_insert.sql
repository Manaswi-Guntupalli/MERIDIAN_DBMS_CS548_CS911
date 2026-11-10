-- Insert a demonstration student into the actual table
-- Concepts: INSERT; SELECT; RETURNING
-- Data: One demo Student row in the existing school and class
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 02_insert.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
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
END $$;
INSERT INTO public."Student" (id,"schoolId","admissionNo","rollNo",name,"classId","updatedAt")
SELECT 'rubric_demo_student',x.school_id,'RUBRIC-DEMO-ONLY',999,'Rubric Demo Student',s."classId",TIMESTAMP '2026-11-10 00:00:00'
FROM rubric_context x JOIN public."Student" s ON s.id=x.student_id
RETURNING "admissionNo",name,"rollNo",active;

ROLLBACK;
