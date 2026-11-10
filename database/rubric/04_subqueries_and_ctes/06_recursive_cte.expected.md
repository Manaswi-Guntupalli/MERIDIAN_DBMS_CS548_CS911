# Expected output: Fill the final seven recorded attendance dates

SQL: [06_recursive_cte.sql](06_recursive_cte.sql)

Data: Existing attendance; anchored to last recorded date rather than the clock.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (7 rows)

| date | recorded | attended |
| --- | --- | --- |
| 2026-11-04 | 0 | 0 |
| 2026-11-05 | 0 | 0 |
| 2026-11-06 | 0 | 0 |
| 2026-11-07 | 0 | 0 |
| 2026-11-08 | 0 | 0 |
| 2026-11-09 | 1 | 1 |
| 2026-11-10 | 2 | 2 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
