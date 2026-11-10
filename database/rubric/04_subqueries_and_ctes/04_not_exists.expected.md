# Expected output: Find students with no unpaid fee accounts

SQL: [04_not_exists.sql](04_not_exists.sql)

Data: Existing students; includes students with no fee accounts, if any.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name |
| --- | --- |
| ADM-2026-0001 | Rohan Rao |
| ADM-2026-0004 | Vivaan Nair |
| ADM-2026-0007 | Ananya Bose |
| ADM-2026-0010 | Aryan Kapoor |
| ADM-2026-0013 | Kiara Rao |
| ADM-2026-0016 | Advait Nair |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
