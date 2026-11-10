# Expected output: Add a validated column to the demonstration roster

SQL: [02_alter_table.sql](02_alter_table.sql)

Data: New rollback-only roster populated from existing Student rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admission_no | student_name | participation_score |
| --- | --- | --- |
| ADM-2026-0001 | Rohan Rao | 0 |
| ADM-2026-0002 | Ishaan Iyer | 0 |
| ADM-2026-0003 | Sara Shah | 0 |
| ADM-2026-0004 | Vivaan Nair | 0 |
| ADM-2026-0005 | Neha Gupta | 0 |
| ADM-2026-0006 | Kabir Reddy | 0 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
