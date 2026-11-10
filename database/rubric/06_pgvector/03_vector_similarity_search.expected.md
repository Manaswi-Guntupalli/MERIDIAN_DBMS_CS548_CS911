# Expected output: Retrieve policy text by meaning

SQL: [03_vector_similarity_search.sql](03_vector_similarity_search.sql)

Data: Genuine query embedding and six genuine stored text embeddings.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| title | category | cosine_similarity |
| --- | --- | --- |
| Reporting student absence | POLICY | 0.569458 |
| Emergency assembly instructions | NOTICE | 0.363447 |
| Published timetable changes | NOTICE | 0.302050 |
| Library borrowing rules | POLICY | 0.179937 |
| Fee payment deadlines | POLICY | 0.150310 |
| Science laboratory safety | DOCUMENT | 0.118075 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
