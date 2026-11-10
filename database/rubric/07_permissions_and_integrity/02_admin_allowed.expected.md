# Expected output: Prove the database allows administrator CRUD

SQL: [02_admin_allowed.sql](02_admin_allowed.sql)

Data: Demo knowledge entry; actual admin identity read from User.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| database_role | application_role |
| --- | --- |
| meridian_knowledge | ADMIN |

## Result 2: INSERT (1 row)

| title | revision |
| --- | --- |
| Administrator created policy | 1 |

## Result 3: DELETE (1 row)

| title |
| --- |
| Administrator created policy |

## Result 4: UPDATE (1 row)

| title | revision |
| --- | --- |
| Administrator reviewed absence policy | 2 |

## Result 5: DELETE (1 row)

| title |
| --- |
| Administrator reviewed absence policy |

## Result 6: SELECT (1 row)

| remaining_demo_entries |
| --- |
| 5 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
