# Expected output: Upsert a demonstration subject using the installed unique key

SQL: [05_upsert.sql](05_upsert.sql)

Data: One demo Subject row; rolled back.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: INSERT (1 row)

| code | name |
| --- | --- |
| RUBRIC-DEMO | Demo subject |

## Result 2: INSERT (1 row)

| code | name |
| --- | --- |
| RUBRIC-DEMO | Updated demo subject |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
