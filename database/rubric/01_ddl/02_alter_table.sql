-- Add a validated column to the demonstration roster
-- Concepts: ALTER TABLE; DEFAULT; CHECK
-- Data: New rollback-only roster populated from existing Student rows
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 02_alter_table.expected.md in this directory.
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
ALTER TABLE public.rubric_demo_roster ADD COLUMN participation_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.rubric_demo_roster ADD CONSTRAINT rubric_score_range CHECK (participation_score BETWEEN 0 AND 10);
SELECT admission_no,student_name,participation_score FROM public.rubric_demo_roster ORDER BY admission_no;

ROLLBACK;
