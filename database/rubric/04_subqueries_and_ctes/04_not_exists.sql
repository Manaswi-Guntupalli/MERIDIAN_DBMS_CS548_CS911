-- Find students with no unpaid fee accounts
-- Concepts: NOT EXISTS; anti-join
-- Data: Existing students; includes students with no fee accounts, if any
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 04_not_exists.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT s."admissionNo",s.name FROM public."Student" s
WHERE s."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') AND NOT EXISTS (
  SELECT 1 FROM public."Fee" f WHERE f."studentId"=s.id AND f."schoolId"=s."schoolId" AND f.paid<f.amount
) ORDER BY s."admissionNo",s.id LIMIT 6;

ROLLBACK;
