# Expected output: Join actual students to their class teachers

SQL: [01_inner_join.sql](01_inner_join.sql)

Data: Existing Student, Class, Teacher and User rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | student | class_name | class_teacher |
| --- | --- | --- | --- |
| ADM-2026-0001 | Rohan Rao | 6A | Mr. Rao |
| ADM-2026-0002 | Ishaan Iyer | 6A | Mr. Rao |
| ADM-2026-0003 | Sara Shah | 6A | Mr. Rao |
| ADM-2026-0004 | Vivaan Nair | 6A | Mr. Rao |
| ADM-2026-0005 | Neha Gupta | 6A | Mr. Rao |
| ADM-2026-0006 | Kabir Reddy | 6A | Mr. Rao |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
