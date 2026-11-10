# Expected output: Rank students by recorded attendance

SQL: [06_order_and_conditional_aggregation.sql](06_order_and_conditional_aggregation.sql)

Data: Existing daily Attendance records; PRESENT and LATE count as attended.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name | recorded | attended | attendance_percent |
| --- | --- | --- | --- | --- |
| ADM-2026-0003 | Sara Shah | 25 | 25 | 100.00 |
| ADM-2026-0007 | Ananya Bose | 25 | 25 | 100.00 |
| ADM-2026-0013 | Kiara Rao | 25 | 25 | 100.00 |
| ADM-2026-0014 | Vihaan Iyer | 25 | 25 | 100.00 |
| ADM-2026-0017 | Saanvi Gupta | 25 | 25 | 100.00 |
| ADM-2026-0025 | Tara Rao | 25 | 25 | 100.00 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
