-- Calculate the balance for each of six students
-- Concepts: Correlated scalar subquery; COALESCE; SUM
-- Data: Existing Student and Fee rows
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 03_correlated_scalar.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT s."admissionNo",s.name,
coalesce((SELECT sum(f.amount-f.paid) FROM public."Fee" f WHERE f."studentId"=s.id AND f."schoolId"=s."schoolId"),0)::numeric(12,2) AS outstanding
FROM public."Student" s WHERE s."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') ORDER BY s."admissionNo",s.id LIMIT 6;

ROLLBACK;
