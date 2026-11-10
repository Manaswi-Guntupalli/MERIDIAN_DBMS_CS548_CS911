-- Keep every class when counting active students
-- Concepts: LEFT JOIN; COUNT; GROUP BY
-- Data: Existing Class and Student rows
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 02_left_join.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT c.name AS class_name,count(s.id)::integer AS active_students
FROM public."Class" c LEFT JOIN public."Student" s ON s."classId"=c.id AND s."schoolId"=c."schoolId" AND s.active
WHERE c."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') GROUP BY c.id,c.name,c.grade,c.section ORDER BY c.grade,c.section;

ROLLBACK;
