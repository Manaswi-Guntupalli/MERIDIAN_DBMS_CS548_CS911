-- Create and call a transaction-local payment procedure
-- Concepts: CREATE PROCEDURE; CALL; reuse installed payment function
-- Data: Temporary procedure calls real function on one demo Fee
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 02_stored_procedure.expected.md in this directory.
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
CREATE PROCEDURE pg_temp.rubric_pay_demo(p_amount numeric)
LANGUAGE plpgsql AS $$ BEGIN
  PERFORM * FROM public.record_fee_payment('rubric_demo_fee',(SELECT school_id FROM rubric_context),p_amount,'CASH','RUBRIC-DEMO','rubric_demo_payment');
END $$;
CALL pg_temp.rubric_pay_demo(1000.00);
SELECT title,amount,paid,status FROM public."Fee" WHERE id='rubric_demo_fee';

ROLLBACK;
