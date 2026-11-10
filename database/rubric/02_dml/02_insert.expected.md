# Expected output: Insert a demonstration student into the actual table

SQL: [02_insert.sql](02_insert.sql)

Data: One demo Student row in the existing school and class.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: INSERT (1 row)

| admissionNo | name | rollNo | active |
| --- | --- | --- | --- |
| RUBRIC-DEMO-ONLY | Rubric Demo Student | 999 | true |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
