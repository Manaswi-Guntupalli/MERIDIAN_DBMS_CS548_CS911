-- Read six real students and their classes
-- Concepts: SELECT; WHERE; ORDER BY; LIMIT
-- Data: Existing Student and Class rows
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 01_select.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT s."admissionNo",s.name,c.name AS class_name
FROM public."Student" s LEFT JOIN public."Class" c ON c.id=s."classId" AND c."schoolId"=s."schoolId"
WHERE s."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') ORDER BY s."admissionNo",s.id LIMIT 6;

ROLLBACK;
