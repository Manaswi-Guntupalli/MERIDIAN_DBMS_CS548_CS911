# Expected output: Read six real students and their classes

SQL: [01_select.sql](01_select.sql)

Data: Existing Student and Class rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name | class_name |
| --- | --- | --- |
| ADM-2026-0001 | Rohan Rao | 6A |
| ADM-2026-0002 | Ishaan Iyer | 6A |
| ADM-2026-0003 | Sara Shah | 6A |
| ADM-2026-0004 | Vivaan Nair | 6A |
| ADM-2026-0005 | Neha Gupta | 6A |
| ADM-2026-0006 | Kabir Reddy | 6A |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
