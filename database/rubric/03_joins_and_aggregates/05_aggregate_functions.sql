-- Compare existing fee categories
-- Concepts: COUNT; SUM; AVG; MIN; MAX; GROUP BY
-- Data: Existing Fee rows; money kept as exact numeric
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 05_aggregate_functions.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT title,count(*)::integer AS accounts,sum(amount)::numeric(12,2) AS billed,
sum(paid)::numeric(12,2) AS collected,round(avg(amount),2) AS average_fee,min(amount) AS minimum_fee,max(amount) AS maximum_fee
FROM public."Fee" WHERE "schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') GROUP BY title ORDER BY title;

ROLLBACK;
