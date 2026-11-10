# Expected output: Prove a teacher can read but cannot modify the library

SQL: [03_teacher_read_only.sql](03_teacher_read_only.sql)

Data: Demo knowledge rows; actual teacher identity.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| database_role | application_role |
| --- | --- |
| meridian_knowledge | TEACHER |

## Result 2: SELECT (1 row)

| visible_demo_entries |
| --- |
| 6 |

## Result 3: SELECT (1 row)

| updated_rows |
| --- |
| 0 |

## Result 4: SELECT (1 row)

| deleted_rows |
| --- |
| 0 |

## Result 5: SELECT (1 row)

| rejected_insert_sqlstate |
| --- |
| 42501 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
