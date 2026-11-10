# Expected output: Verify pgvector creation and native storage

SQL: [01_vector_creation.sql](01_vector_creation.sql)

Data: Installed extension/table plus a temporary vector table.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| extname | extversion |
| --- | --- |
| vector | 0.8.7 |

## Result 2: SELECT (1 row)

| table_name | embedding_type |
| --- | --- |
| KnowledgeItem | vector(384) |

## Result 3: SELECT (1 row)

| indexname | indexdef |
| --- | --- |
| knowledge_embedding_hnsw | CREATE INDEX knowledge_embedding_hnsw ON public."KnowledgeItem" USING hnsw (embedding vector_cosine_ops) |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
