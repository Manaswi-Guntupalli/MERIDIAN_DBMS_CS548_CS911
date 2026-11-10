# Expected output: Filter semantic results by category and school

SQL: [06_filtered_vector_read.sql](06_filtered_vector_read.sql)

Data: Genuine demo entries; POLICY-only cosine ranking.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (3 rows)

| title | category | cosine_similarity |
| --- | --- | --- |
| Reporting student absence | POLICY | 0.569458 |
| Library borrowing rules | POLICY | 0.179937 |
| Fee payment deadlines | POLICY | 0.150310 |

## Result 2: SELECT (3 rows)

| category | entries |
| --- | --- |
| DOCUMENT | 1 |
| NOTICE | 2 |
| POLICY | 3 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
