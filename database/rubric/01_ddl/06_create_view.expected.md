# Expected output: Create a class-enrolment view over actual tables

SQL: [06_create_view.sql](06_create_view.sql)

Data: Temporary view over existing Class and Student tables.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| class_name | students |
| --- | --- |
| 10A | 22 |
| 6A | 22 |
| 7A | 22 |
| 8A | 23 |
| 9A | 22 |
| 9B | 22 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
