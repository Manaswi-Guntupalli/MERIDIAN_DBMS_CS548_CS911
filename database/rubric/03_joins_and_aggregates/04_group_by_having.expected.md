# Expected output: Find classes with outstanding fees

SQL: [04_group_by_having.sql](04_group_by_having.sql)

Data: Existing Student, Class and Fee rows; unpaid totals per class.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| class_name | students_with_fees | outstanding |
| --- | --- | --- |
| 10A | 22 | 70925.00 |
| 9B | 22 | 64000.00 |
| 7A | 22 | 62999.80 |
| 8A | 22 | 60000.00 |
| 6A | 22 | 48300.00 |
| 9A | 22 | 46700.00 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
