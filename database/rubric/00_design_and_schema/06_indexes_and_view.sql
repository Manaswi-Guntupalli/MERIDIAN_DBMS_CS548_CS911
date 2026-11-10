-- Inspect the installed indexes and fee view
-- Concepts: B-tree; GIN; HNSW; partial unique index; view
-- Data: Existing schema
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 06_indexes_and_view.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'
AND (tablename='KnowledgeItem' OR indexname IN ('fee_school_due','one_live_timetable'))
ORDER BY tablename,indexname;
SELECT viewname,definition FROM pg_views WHERE schemaname='public' AND viewname='school_fee_summary';

ROLLBACK;
