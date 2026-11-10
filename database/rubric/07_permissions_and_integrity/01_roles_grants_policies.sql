-- Inspect database roles, grants and policies
-- Concepts: Roles; GRANT; REVOKE; RLS policy catalogue; minimum two application roles
-- Data: Existing roles/policies plus GRANT/REVOKE on a temporary roster view
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 01_roles_grants_policies.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT rolname,rolcanlogin,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('meridian','meridian_knowledge') ORDER BY rolname;
SELECT privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='KnowledgeItem' AND grantee='meridian_knowledge' ORDER BY privilege_type;
SELECT policyname,cmd,roles::text FROM pg_policies WHERE schemaname='public' AND tablename='KnowledgeItem' ORDER BY policyname;
SELECT role,count(*)::integer AS accounts FROM public."User" WHERE "schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') GROUP BY role ORDER BY role;
-- Execute DCL on a demo view only; the application's existing grants remain unchanged.
CREATE TEMP VIEW rubric_permission_view AS SELECT "admissionNo",name FROM public."Student" WHERE "schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN');
GRANT SELECT ON rubric_permission_view TO meridian_knowledge;
SELECT has_table_privilege('meridian_knowledge','pg_temp.rubric_permission_view','SELECT') AS can_select_after_grant;
REVOKE SELECT ON rubric_permission_view FROM meridian_knowledge;
SELECT has_table_privilege('meridian_knowledge','pg_temp.rubric_permission_view','SELECT') AS can_select_after_revoke;

ROLLBACK;
