# Expected output: Prove mismatched school context cannot read entries

SQL: [05_wrong_school_context.sql](05_wrong_school_context.sql)

Data: Demo entries remain in MERIDIAN; authenticated user school is deliberately mismatched.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| mismatched_identity_rejected |
| --- |
| true |

## Result 2: SELECT (1 row)

| visible_demo_entries |
| --- |
| 0 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
