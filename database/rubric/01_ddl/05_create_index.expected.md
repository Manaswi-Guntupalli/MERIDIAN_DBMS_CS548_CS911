# Expected output: Create and inspect a B-tree index

SQL: [05_create_index.sql](05_create_index.sql)

Data: Rollback-only roster index; also inspect installed live indexes.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (3 rows)

| index_name | index_method | is_unique |
| --- | --- | --- |
| rubric_demo_roster_admission_no_key | btree | true |
| rubric_demo_roster_pkey | btree | true |
| rubric_roster_school_roll | btree | false |

## Result 2: SELECT (4 rows)

| indexname |
| --- |
| KnowledgeItem_pkey |
| knowledge_embedding_hnsw |
| knowledge_fulltext |
| knowledge_school_category |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
