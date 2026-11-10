-- Build attendance summaries before joining students
-- Concepts: WITH CTE; aggregation; LEFT JOIN
-- Data: Existing Attendance and Student rows
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 05_cte.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
WITH counts AS (
  SELECT "studentId",count(*) AS recorded,count(*) FILTER (WHERE status IN ('PRESENT','LATE')) AS attended
  FROM public."Attendance" WHERE "schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') GROUP BY "studentId"
)
SELECT s."admissionNo",s.name,coalesce(c.recorded,0)::integer AS recorded,
round(100.0*c.attended/nullif(c.recorded,0),2) AS attendance_percent
FROM public."Student" s LEFT JOIN counts c ON c."studentId"=s.id
WHERE s."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') ORDER BY s."admissionNo",s.id LIMIT 6;

ROLLBACK;
