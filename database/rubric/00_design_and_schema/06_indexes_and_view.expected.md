# Expected output: Inspect the installed indexes and fee view

SQL: [06_indexes_and_view.sql](06_indexes_and_view.sql)

Data: Existing schema.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| tablename | indexname | indexdef |
| --- | --- | --- |
| Fee | fee_school_due | CREATE INDEX fee_school_due ON public."Fee" USING btree ("schoolId", "dueDate") |
| KnowledgeItem | KnowledgeItem_pkey | CREATE UNIQUE INDEX "KnowledgeItem_pkey" ON public."KnowledgeItem" USING btree (id) |
| KnowledgeItem | knowledge_embedding_hnsw | CREATE INDEX knowledge_embedding_hnsw ON public."KnowledgeItem" USING hnsw (embedding vector_cosine_ops) |
| KnowledgeItem | knowledge_fulltext | CREATE INDEX knowledge_fulltext ON public."KnowledgeItem" USING gin (to_tsvector('english'::regconfig, ((title \|\| ' '::text) \|\| content))) |
| KnowledgeItem | knowledge_school_category | CREATE INDEX knowledge_school_category ON public."KnowledgeItem" USING btree ("schoolId", category) |
| Timetable | one_live_timetable | CREATE UNIQUE INDEX one_live_timetable ON public."Timetable" USING btree ("schoolId") WHERE (active AND (status = 'PUBLISHED'::text)) |

## Result 2: SELECT (1 row)

| viewname | definition |
| --- | --- |
| school_fee_summary |  SELECT "schoolId",<br>    (count(*))::integer AS accounts,<br>    sum(amount) AS billed,<br>    sum(paid) AS collected,<br>    sum((amount - paid)) AS outstanding<br>   FROM "Fee"<br>  GROUP BY "schoolId"; |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
