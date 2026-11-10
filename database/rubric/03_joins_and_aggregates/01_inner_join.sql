-- Join actual students to their class teachers
-- Concepts: INNER JOIN; multiple relationships
-- Data: Existing Student, Class, Teacher and User rows
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 01_inner_join.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT s."admissionNo",s.name AS student,c.name AS class_name,u.name AS class_teacher
FROM public."Student" s JOIN public."Class" c ON c.id=s."classId" AND c."schoolId"=s."schoolId"
JOIN public."Teacher" t ON t.id=c."classTeacherId" JOIN public."User" u ON u.id=t."userId"
WHERE s."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') ORDER BY s."admissionNo",s.id LIMIT 6;

ROLLBACK;
