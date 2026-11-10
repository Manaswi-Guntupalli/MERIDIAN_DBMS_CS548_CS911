-- Find classes with outstanding fees
-- Concepts: JOIN; GROUP BY; HAVING; SUM; COUNT DISTINCT
-- Data: Existing Student, Class and Fee rows; unpaid totals per class
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 04_group_by_having.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT c.name AS class_name,count(DISTINCT s.id)::integer AS students_with_fees,
sum(f.amount-f.paid)::numeric(12,2) AS outstanding
FROM public."Class" c JOIN public."Student" s ON s."classId"=c.id AND s."schoolId"=c."schoolId"
JOIN public."Fee" f ON f."studentId"=s.id AND f."schoolId"=s."schoolId"
WHERE c."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') GROUP BY c.id,c.name
HAVING sum(f.amount-f.paid)>0 ORDER BY outstanding DESC,c.name;

ROLLBACK;
