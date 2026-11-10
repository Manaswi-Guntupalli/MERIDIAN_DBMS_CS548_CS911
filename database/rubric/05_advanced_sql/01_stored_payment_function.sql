-- Call the actual atomic fee-payment function
-- Concepts: Stored PL/pgSQL function; row locking; atomic payment
-- Data: One demo Fee and Payment linked to an existing student
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 01_stored_payment_function.expected.md in this directory.
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
-- Demo fee for an existing student. No existing fee or payment is changed.
INSERT INTO public."Fee" (id,"schoolId","studentId",title,amount,paid,"dueDate",status)
SELECT 'rubric_demo_fee',school_id,student_id,'Rubric demonstration fee',1000.00,0.00,'2026-12-01','PENDING'
FROM rubric_context;
SELECT * FROM public.record_fee_payment('rubric_demo_fee',(SELECT school_id FROM rubric_context),250.00::numeric,'CASH','RUBRIC-DEMO','rubric_demo_payment');
SELECT f.title,f.amount,f.paid,f.amount-f.paid AS outstanding,f.status,count(p.id)::integer AS payment_rows
FROM public."Fee" f LEFT JOIN public."Payment" p ON p."feeId"=f.id WHERE f.id='rubric_demo_fee' GROUP BY f.id;

ROLLBACK;
