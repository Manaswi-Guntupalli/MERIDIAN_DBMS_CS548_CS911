-- Find fee accounts above the school average
-- Concepts: Nested scalar subquery; AVG
-- Data: Existing Fee and Student rows
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 01_nested_subquery.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT s."admissionNo",s.name,f.title,f.amount
FROM public."Fee" f JOIN public."Student" s ON s.id=f."studentId"
WHERE f."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') AND f.amount>(SELECT avg(amount) FROM public."Fee" WHERE "schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN'))
ORDER BY f.amount DESC,s."admissionNo",f.title,f.id LIMIT 6;

ROLLBACK;
