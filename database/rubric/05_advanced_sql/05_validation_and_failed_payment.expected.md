# Expected output: Verify function validation and reject overpayment

SQL: [05_validation_and_failed_payment.sql](05_validation_and_failed_payment.sql)

Data: One demo Fee; real calendar validator and payment function.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (3 rows)

| input | valid |
| --- | --- |
| 2026-02-28 | true |
| 2026-02-30 | false |
| not-a-date | false |

## Result 2: SELECT (1 row)

| overpayment_sqlstate |
| --- |
| P0001 |

## Result 3: SELECT (1 row)

| paid | status | payment_rows |
| --- | --- | --- |
| 0.00 | PENDING | 0 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
