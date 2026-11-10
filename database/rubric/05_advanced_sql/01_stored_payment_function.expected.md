# Expected output: Call the actual atomic fee-payment function

SQL: [01_stored_payment_function.sql](01_stored_payment_function.sql)

Data: One demo Fee and Payment linked to an existing student.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (1 row)

| paymentId | paid | status |
| --- | --- | --- |
| rubric_demo_payment | 250.00 | PARTIAL |

## Result 2: SELECT (1 row)

| title | amount | paid | outstanding | status | payment_rows |
| --- | --- | --- | --- | --- | --- |
| Rubric demonstration fee | 1000.00 | 250.00 | 750.00 | PARTIAL | 1 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
