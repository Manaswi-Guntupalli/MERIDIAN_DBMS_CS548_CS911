-- Drop only the demonstration roster
-- Concepts: DROP TABLE; object lifecycle
-- Data: New demonstration table only; existing school tables remain intact
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 03_drop_table.expected.md in this directory.
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
SELECT count(*)::integer AS rows_before_drop FROM public.rubric_demo_roster;
DROP TABLE public.rubric_demo_roster;
SELECT to_regclass('public.rubric_demo_roster') IS NULL AS demo_table_dropped,
       to_regclass('public."Student"') IS NOT NULL AS actual_student_table_exists;

ROLLBACK;
