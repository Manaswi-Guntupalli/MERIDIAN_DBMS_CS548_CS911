# Expected output: Calculate the balance for each of six students

SQL: [03_correlated_scalar.sql](03_correlated_scalar.sql)

Data: Existing Student and Fee rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name | outstanding |
| --- | --- | --- |
| ADM-2026-0001 | Rohan Rao | 0.00 |
| ADM-2026-0002 | Ishaan Iyer | 2200.00 |
| ADM-2026-0003 | Sara Shah | 2200.00 |
| ADM-2026-0004 | Vivaan Nair | 0.00 |
| ADM-2026-0005 | Neha Gupta | 4700.00 |
| ADM-2026-0006 | Kabir Reddy | 2200.00 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
