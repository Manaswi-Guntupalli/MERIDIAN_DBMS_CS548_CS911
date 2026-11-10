# Expected output: Exercise the actual knowledge audit trigger

SQL: [03_trigger_audit.sql](03_trigger_audit.sql)

Data: Six genuine-vector demo entries in actual KnowledgeItem; all rolled back.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (3 rows)

| operation | revision | correct_actor |
| --- | --- | --- |
| INSERT | 1 | true |
| UPDATE | 2 | true |
| DELETE | 2 | true |

## Result 2: SELECT (1 row)

| deleted_item_remaining |
| --- |
| 0 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
