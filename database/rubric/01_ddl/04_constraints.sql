-- Execute failing PK, FK, CHECK and NOT NULL cases
-- Concepts: Database validation; expected SQLSTATE errors
-- Data: New rollback-only table with FKs to real Student and School
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 04_constraints.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
-- PostgreSQL FKs must connect tables with the same persistence type.
-- This real table references real School/Student keys and disappears at ROLLBACK.
CREATE TABLE public.rubric_demo_roster (
  student_id text PRIMARY KEY REFERENCES public."Student"(id),
  school_id text NOT NULL REFERENCES public."School"(id),
  admission_no text UNIQUE NOT NULL,
  student_name text NOT NULL,
  roll_no integer NOT NULL CHECK (roll_no > 0)
);
INSERT INTO public.rubric_demo_roster
SELECT id,"schoolId","admissionNo",name,"rollNo" FROM public."Student"
WHERE "schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') ORDER BY "admissionNo",id LIMIT 6;

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
SELECT 'PRIMARY KEY duplicate' AS test,pg_temp.expect_error(
  'INSERT INTO public.rubric_demo_roster SELECT student_id,school_id,admission_no||''-duplicate'',student_name,roll_no FROM public.rubric_demo_roster ORDER BY admission_no LIMIT 1','23505') AS sqlstate
UNION ALL SELECT 'FOREIGN KEY missing student',pg_temp.expect_error(
  'INSERT INTO public.rubric_demo_roster VALUES (''rubric_missing_student'',(SELECT id FROM public."School" WHERE code=''MERIDIAN''),''DEMO-MISSING'',''Missing student'',1)','23503')
UNION ALL SELECT 'CHECK nonpositive roll',pg_temp.expect_error('UPDATE public.rubric_demo_roster SET roll_no=0','23514')
UNION ALL SELECT 'NOT NULL student name',pg_temp.expect_error('UPDATE public.rubric_demo_roster SET student_name=NULL','23502')
ORDER BY test;

ROLLBACK;
