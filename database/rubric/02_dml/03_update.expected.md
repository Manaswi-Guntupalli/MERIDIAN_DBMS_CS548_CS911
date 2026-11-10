# Expected output: Update only the demonstration student

SQL: [03_update.sql](03_update.sql)

Data: One demo Student row; existing student records untouched.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| admissionNo | before_name |
| --- | --- |
| RUBRIC-DEMO-ONLY | Rubric Demo Student |

## Result 2: UPDATE (1 row)

| admissionNo | after_name |
| --- | --- |
| RUBRIC-DEMO-ONLY | Rubric Demo Student Reviewed |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
