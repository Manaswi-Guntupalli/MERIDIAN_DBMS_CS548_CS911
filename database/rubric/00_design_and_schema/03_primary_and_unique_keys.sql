-- Show installed primary and unique keys
-- Concepts: PRIMARY KEY; UNIQUE; composite keys
-- Data: Existing schema
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 03_primary_and_unique_keys.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT r.relname AS table_name,idx.relname AS key_name,
CASE WHEN i.indisprimary THEN 'PRIMARY KEY' ELSE 'UNIQUE INDEX' END AS key_type,
pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i JOIN pg_class r ON r.oid=i.indrelid JOIN pg_class idx ON idx.oid=i.indexrelid
WHERE r.relnamespace='public'::regnamespace AND i.indisunique
AND r.relname IN ('Student','Class','Fee','Attendance','AttendanceVerification','KnowledgeItem')
ORDER BY r.relname,idx.relname;

ROLLBACK;
