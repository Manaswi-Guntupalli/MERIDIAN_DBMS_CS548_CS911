# Expected output: Test actual database-level monetary, calendar, role and attendance rules

SQL: [06_database_validation.sql](06_database_validation.sql)

Data: Demo fee/student/session/verification rows only; real constraints remain installed.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| test | sqlstate |
| --- | --- |
| Active session must use QR_FACE | 23514 |
| Fee cannot be negative | 23514 |
| Fee cannot be overpaid | 23514 |
| Fee due date must exist | 23514 |
| Present requires both QR and face proofs | 23514 |
| Student roll must be positive | 23514 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
