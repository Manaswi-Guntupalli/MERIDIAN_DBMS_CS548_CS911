# Expected output: Create and call a transaction-local payment procedure

SQL: [02_stored_procedure.sql](02_stored_procedure.sql)

Data: Temporary procedure calls real function on one demo Fee.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| title | amount | paid | status |
| --- | --- | --- | --- |
| Rubric demonstration fee | 1000.00 | 1000.00 | PAID |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
