# Expected output: Create six demo fees for existing students

SQL: [06_insert_select.sql](06_insert_select.sql)

Data: Six demo Fee rows related to real students; rolled back.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name | title | amount | paid |
| --- | --- | --- | --- | --- |
| ADM-2026-0001 | Rohan Rao | Rubric field trip | 150.00 | 0.00 |
| ADM-2026-0002 | Ishaan Iyer | Rubric field trip | 150.00 | 0.00 |
| ADM-2026-0003 | Sara Shah | Rubric field trip | 150.00 | 0.00 |
| ADM-2026-0004 | Vivaan Nair | Rubric field trip | 150.00 | 0.00 |
| ADM-2026-0005 | Neha Gupta | Rubric field trip | 150.00 | 0.00 |
| ADM-2026-0006 | Kabir Reddy | Rubric field trip | 150.00 | 0.00 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
