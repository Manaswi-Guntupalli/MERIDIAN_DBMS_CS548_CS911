# Expected output: Drop only the demonstration roster

SQL: [03_drop_table.sql](03_drop_table.sql)

Data: New demonstration table only; existing school tables remain intact.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| rows_before_drop |
| --- |
| 6 |

## Result 2: SELECT (1 row)

| demo_table_dropped | actual_student_table_exists |
| --- | --- |
| true | true |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
