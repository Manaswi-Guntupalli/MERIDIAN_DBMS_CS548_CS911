-- Show actual table relationships
-- Concepts: FOREIGN KEY; referential integrity
-- Data: Existing schema
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 04_foreign_keys.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT r.relname AS table_name,c.conname AS constraint_name,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
WHERE c.connamespace='public'::regnamespace AND c.contype='f'
AND r.relname IN ('Student','StudentParent','Fee','Payment','TimetableSlot','KnowledgeItem')
ORDER BY r.relname,c.conname;

ROLLBACK;
