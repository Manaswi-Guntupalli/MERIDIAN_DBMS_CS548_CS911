-- Create a class-enrolment view over actual tables
-- Concepts: CREATE VIEW; LEFT JOIN; GROUP BY
-- Data: Temporary view over existing Class and Student tables
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 06_create_view.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
CREATE TEMP VIEW rubric_class_enrolment AS
SELECT c.name AS class_name,count(s.id)::integer AS students
FROM public."Class" c LEFT JOIN public."Student" s ON s."classId"=c.id AND s."schoolId"=c."schoolId"
WHERE c."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') GROUP BY c.id,c.name;
SELECT * FROM rubric_class_enrolment ORDER BY class_name;

ROLLBACK;
