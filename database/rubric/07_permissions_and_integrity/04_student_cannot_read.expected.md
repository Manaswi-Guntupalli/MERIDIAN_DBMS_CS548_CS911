# Expected output: Prove students cannot read the staff library

SQL: [04_student_cannot_read.sql](04_student_cannot_read.sql)

Data: Demo knowledge rows; actual active student identity.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| application_role |
| --- |
| STUDENT |

## Result 2: SELECT (1 row)

| visible_demo_entries |
| --- |
| 0 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
