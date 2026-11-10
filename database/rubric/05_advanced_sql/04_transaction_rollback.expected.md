# Expected output: Roll back a payment with a savepoint

SQL: [04_transaction_rollback.sql](04_transaction_rollback.sql)

Data: One demo fee; payment and balance both reversed.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| paymentId | paid | status |
| --- | --- | --- |
| rubric_demo_payment | 250.00 | PARTIAL |

## Result 2: SELECT (1 row)

| amount | paid | status | payment_rows |
| --- | --- | --- | --- |
| 1000.00 | 0.00 | PENDING | 0 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
