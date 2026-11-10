# Expected output: Find students with at least one unpaid fee

SQL: [02_correlated_exists.sql](02_correlated_exists.sql)

Data: Existing Student and Fee rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name |
| --- | --- |
| ADM-2026-0002 | Ishaan Iyer |
| ADM-2026-0003 | Sara Shah |
| ADM-2026-0005 | Neha Gupta |
| ADM-2026-0006 | Kabir Reddy |
| ADM-2026-0008 | Arjun Sharma |
| ADM-2026-0009 | Diya Menon |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
