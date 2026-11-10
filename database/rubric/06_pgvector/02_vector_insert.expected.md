# Expected output: Insert six genuine sentence embeddings

SQL: [02_vector_insert.sql](02_vector_insert.sql)

Data: Six demo KnowledgeItem rows; actual school/admin; rolled back.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| title | category | model | dimensions | norm |
| --- | --- | --- | --- | --- |
| Emergency assembly instructions | NOTICE | Xenova/all-MiniLM-L6-v2 | 384 | 1.0000 |
| Fee payment deadlines | POLICY | Xenova/all-MiniLM-L6-v2 | 384 | 1.0000 |
| Library borrowing rules | POLICY | Xenova/all-MiniLM-L6-v2 | 384 | 1.0000 |
| Published timetable changes | NOTICE | Xenova/all-MiniLM-L6-v2 | 384 | 1.0000 |
| Reporting student absence | POLICY | Xenova/all-MiniLM-L6-v2 | 384 | 1.0000 |
| Science laboratory safety | DOCUMENT | Xenova/all-MiniLM-L6-v2 | 384 | 1.0000 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
