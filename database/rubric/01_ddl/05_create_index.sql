-- Create and inspect a B-tree index
-- Concepts: CREATE INDEX; index metadata
-- Data: Rollback-only roster index; also inspect installed live indexes
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 05_create_index.expected.md in this directory.
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
CREATE INDEX rubric_roster_school_roll ON public.rubric_demo_roster(school_id,roll_no);
SELECT c.relname AS index_name,a.amname AS index_method,i.indisunique AS is_unique
FROM pg_class c JOIN pg_index i ON i.indexrelid=c.oid JOIN pg_am a ON a.oid=c.relam
WHERE i.indrelid='public.rubric_demo_roster'::regclass ORDER BY c.relname;
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='KnowledgeItem' ORDER BY indexname;

ROLLBACK;
