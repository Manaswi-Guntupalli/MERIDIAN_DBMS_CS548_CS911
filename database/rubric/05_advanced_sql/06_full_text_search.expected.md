# Expected output: Search policy text using PostgreSQL full-text search

SQL: [06_full_text_search.sql](06_full_text_search.sql)

Data: Genuine-vector demo entries in actual KnowledgeItem.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| title | category | lexical_rank |
| --- | --- | --- |
| Reporting student absence | POLICY | 0.084791 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
