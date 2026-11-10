-- Fill the final seven recorded attendance dates
-- Concepts: WITH RECURSIVE; date series; LEFT JOIN
-- Data: Existing attendance; anchored to last recorded date rather than the clock
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 06_recursive_cte.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
WITH RECURSIVE last_day AS (
 SELECT max(date)::date AS day FROM public."Attendance" WHERE "schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN')
), days(day) AS (
 SELECT day-6 FROM last_day WHERE day IS NOT NULL
 UNION ALL SELECT d.day+1 FROM days d CROSS JOIN last_day l WHERE d.day<l.day
)
SELECT d.day::text AS date,count(a.id)::integer AS recorded,
count(a.id) FILTER (WHERE a.status IN ('PRESENT','LATE'))::integer AS attended
FROM days d LEFT JOIN public."Attendance" a ON a.date=d.day::text AND a."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN')
GROUP BY d.day ORDER BY d.day;

ROLLBACK;
