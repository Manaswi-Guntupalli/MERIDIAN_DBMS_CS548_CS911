-- Test actual database-level monetary, calendar, role and attendance rules
-- Concepts: CHECK constraints; immutable tenant; QR+face requirement; SQLSTATE
-- Data: Demo fee/student/session/verification rows only; real constraints remain installed
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 06_database_validation.expected.md in this directory.
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
-- This is a demo row in the ACTUAL Student table; ROLLBACK removes it.
INSERT INTO public."Student" (id,"schoolId","admissionNo","rollNo",name,"classId","updatedAt")
SELECT 'rubric_demo_student',x.school_id,'RUBRIC-DEMO-ONLY',999,'Rubric Demo Student',s."classId",TIMESTAMP '2026-11-10 00:00:00'
FROM rubric_context x JOIN public."Student" s ON s.id=x.student_id;
-- Demo fee for an existing student. No existing fee or payment is changed.
INSERT INTO public."Fee" (id,"schoolId","studentId",title,amount,paid,"dueDate",status)
SELECT 'rubric_demo_fee',school_id,student_id,'Rubric demonstration fee',1000.00,0.00,'2026-12-01','PENDING'
FROM rubric_context;
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
END $$;
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
SELECT test,sqlstate FROM rubric_integrity_results ORDER BY test;

ROLLBACK;
