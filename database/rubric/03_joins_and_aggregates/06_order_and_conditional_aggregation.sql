-- Rank students by recorded attendance
-- Concepts: FILTER; conditional aggregation; NULLIF; ORDER BY
-- Data: Existing daily Attendance records; PRESENT and LATE count as attended
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 06_order_and_conditional_aggregation.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT s."admissionNo",s.name,count(a.id)::integer AS recorded,
count(a.id) FILTER (WHERE a.status IN ('PRESENT','LATE'))::integer AS attended,
round(100.0*count(a.id) FILTER (WHERE a.status IN ('PRESENT','LATE'))/nullif(count(a.id),0),2) AS attendance_percent
FROM public."Student" s LEFT JOIN public."Attendance" a ON a."studentId"=s.id AND a."schoolId"=s."schoolId"
WHERE s."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') GROUP BY s.id,s."admissionNo",s.name
ORDER BY attendance_percent DESC NULLS LAST,s."admissionNo",s.id LIMIT 6;

ROLLBACK;
