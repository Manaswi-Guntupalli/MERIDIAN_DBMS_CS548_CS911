# Expected output: Create a roster with real student and school references

SQL: [01_create_table.sql](01_create_table.sql)

Data: New rollback-only table populated from existing Student rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admission_no | student_name | roll_no |
| --- | --- | --- |
| ADM-2026-0001 | Rohan Rao | 1 |
| ADM-2026-0002 | Ishaan Iyer | 2 |
| ADM-2026-0003 | Sara Shah | 3 |
| ADM-2026-0004 | Vivaan Nair | 4 |
| ADM-2026-0005 | Neha Gupta | 5 |
| ADM-2026-0006 | Kabir Reddy | 6 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
