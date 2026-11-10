-- Verify pgvector creation and native storage
-- Concepts: CREATE EXTENSION; vector(384); HNSW; model metadata
-- Data: Installed extension/table plus a temporary vector table
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 01_vector_creation.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
CREATE EXTENSION IF NOT EXISTS vector;
-- Same native table definition as the installed application. IF NOT EXISTS
-- leaves the existing table intact; it is not a replacement or migration.
CREATE TABLE IF NOT EXISTS public."KnowledgeItem" (
  id text PRIMARY KEY,
  "schoolId" text NOT NULL REFERENCES public."School"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 20 AND 12000),
  category text NOT NULL CHECK (category IN ('POLICY','NOTICE','DOCUMENT')),
  "sourceId" text,
  "createdBy" text NOT NULL REFERENCES public."User"(id),
  model text NOT NULL DEFAULT 'Xenova/all-MiniLM-L6-v2' CHECK (model='Xenova/all-MiniLM-L6-v2'),
  embedding vector(384) NOT NULL CHECK (vector_norm(embedding)>0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_embedding_hnsw ON public."KnowledgeItem" USING hnsw (embedding vector_cosine_ops);
CREATE TEMP TABLE rubric_vector_shape(id integer PRIMARY KEY,embedding vector(384) NOT NULL) ON COMMIT DROP;
SELECT extname,extversion FROM pg_extension WHERE extname='vector';
SELECT c.relname AS table_name,format_type(a.atttypid,a.atttypmod) AS embedding_type
FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid WHERE c.oid='public."KnowledgeItem"'::regclass AND a.attname='embedding';
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='knowledge_embedding_hnsw';

ROLLBACK;
