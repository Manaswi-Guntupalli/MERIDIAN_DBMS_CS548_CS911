# Expected output: Execute failing PK, FK, CHECK and NOT NULL cases

SQL: [04_constraints.sql](04_constraints.sql)

Data: New rollback-only table with FKs to real Student and School.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (4 rows)

| test | sqlstate |
| --- | --- |
| CHECK nonpositive roll | 23514 |
| FOREIGN KEY missing student | 23503 |
| NOT NULL student name | 23502 |
| PRIMARY KEY duplicate | 23505 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
