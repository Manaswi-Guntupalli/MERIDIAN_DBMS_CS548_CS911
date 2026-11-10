# Expected output: Build attendance summaries before joining students

SQL: [05_cte.sql](05_cte.sql)

Data: Existing Attendance and Student rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name | recorded | attendance_percent |
| --- | --- | --- | --- |
| ADM-2026-0001 | Rohan Rao | 26 | 96.15 |
| ADM-2026-0002 | Ishaan Iyer | 25 | 92.00 |
| ADM-2026-0003 | Sara Shah | 25 | 100.00 |
| ADM-2026-0004 | Vivaan Nair | 25 | 84.00 |
| ADM-2026-0005 | Neha Gupta | 25 | 96.00 |
| ADM-2026-0006 | Kabir Reddy | 25 | 96.00 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
