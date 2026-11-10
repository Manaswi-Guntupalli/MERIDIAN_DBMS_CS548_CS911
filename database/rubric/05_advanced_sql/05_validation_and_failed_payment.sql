-- Verify function validation and reject overpayment
-- Concepts: Stored functions; SQLSTATE; failed statement atomicity
-- Data: One demo Fee; real calendar validator and payment function
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 05_validation_and_failed_payment.expected.md in this directory.
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
SELECT d AS input,public.valid_calendar_date(d) AS valid FROM (VALUES ('2026-02-28'),('2026-02-30'),('not-a-date')) AS dates(d) ORDER BY d;
SELECT pg_temp.expect_error(format('SELECT * FROM public.record_fee_payment(%L,%L,1200.00::numeric,%L,NULL,%L)',
'rubric_demo_fee',(SELECT school_id FROM rubric_context),'CASH','rubric_demo_payment'),'P0001') AS overpayment_sqlstate;
SELECT paid,status,(SELECT count(*)::integer FROM public."Payment" WHERE "feeId"='rubric_demo_fee') AS payment_rows FROM public."Fee" WHERE id='rubric_demo_fee';

ROLLBACK;
