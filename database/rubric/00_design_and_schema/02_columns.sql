-- Inspect important table columns
-- Concepts: Attributes; types; nullability; vector dimensions
-- Data: Existing schema
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 02_columns.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT c.table_name,c.column_name,pg_catalog.format_type(a.atttypid,a.atttypmod) AS data_type,c.is_nullable
FROM information_schema.columns c
JOIN pg_namespace n ON n.nspname=c.table_schema
JOIN pg_class t ON t.relnamespace=n.oid AND t.relname=c.table_name
JOIN pg_attribute a ON a.attrelid=t.oid AND a.attname=c.column_name
WHERE c.table_schema='public' AND c.table_name IN ('Student','Fee','KnowledgeItem')
ORDER BY c.table_name,c.ordinal_position;

ROLLBACK;
