# Expected output: Update policy text with a newly computed embedding

SQL: [04_vector_update.sql](04_vector_update.sql)

Data: One demo entry updated with a genuine embedding for the revised text.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: UPDATE (1 row)

| title | revision | dimensions |
| --- | --- | --- |
| Reporting student absence | 2 | 384 |

## Result 2: SELECT (1 row)

| similarity_to_updated_embedding |
| --- |
| 1.000000 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
