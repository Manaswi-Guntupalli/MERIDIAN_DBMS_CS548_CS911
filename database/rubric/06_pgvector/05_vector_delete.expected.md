# Expected output: Delete a vector entry and retain audit history

SQL: [05_vector_delete.sql](05_vector_delete.sql)

Data: One demo entry deleted; all demo operations rolled back.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: DELETE (1 row)

| title | category |
| --- | --- |
| Reporting student absence | POLICY |

## Result 2: SELECT (1 row)

| remaining_searchable_rows |
| --- |
| 5 |

## Result 3: SELECT (2 rows)

| operation | revision |
| --- | --- |
| INSERT | 1 |
| DELETE | 1 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
