# Expected output: Keep every class when counting active students

SQL: [02_left_join.sql](02_left_join.sql)

Data: Existing Class and Student rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| class_name | active_students |
| --- | --- |
| 6A | 22 |
| 7A | 22 |
| 8A | 23 |
| 9A | 22 |
| 9B | 22 |
| 10A | 22 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
