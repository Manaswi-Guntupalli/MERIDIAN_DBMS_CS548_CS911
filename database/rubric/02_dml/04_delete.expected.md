# Expected output: Delete only the demonstration student

SQL: [04_delete.sql](04_delete.sql)

Data: One demo Student row; existing student records untouched.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: DELETE (1 row)

| admissionNo | name |
| --- | --- |
| RUBRIC-DEMO-ONLY | Rubric Demo Student |

## Result 2: SELECT (1 row)

| demo_rows_remaining |
| --- |
| 0 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
