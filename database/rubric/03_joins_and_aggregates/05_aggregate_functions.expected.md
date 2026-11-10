# Expected output: Compare existing fee categories

SQL: [05_aggregate_functions.sql](05_aggregate_functions.sql)

Data: Existing Fee rows; money kept as exact numeric.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (2 rows)

| title | accounts | billed | collected | average_fee | minimum_fee | maximum_fee |
| --- | --- | --- | --- | --- | --- | --- |
| Activity & Lab Fee | 132 | 343200.00 | 114200.00 | 2600.00 | 2200.00 | 2800.00 |
| Term 1 Tuition | 132 | 1793000.00 | 1669075.20 | 13583.33 | 12500.00 | 14500.00 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
