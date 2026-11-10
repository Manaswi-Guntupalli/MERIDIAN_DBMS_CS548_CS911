-- List all actual application tables
-- Concepts: Relational schema; entities
-- Data: Existing schema
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 01_tables.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT LIKE '\_%'
ORDER BY table_name;

ROLLBACK;
