# Expected output: Find fee accounts above the school average

SQL: [01_nested_subquery.sql](01_nested_subquery.sql)

Data: Existing Fee and Student rows.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| admissionNo | name | title | amount |
| --- | --- | --- | --- |
| ADM-2026-0067 | Ananya Bose | Term 1 Tuition | 14500.00 |
| ADM-2026-0068 | Arjun Sharma | Term 1 Tuition | 14500.00 |
| ADM-2026-0069 | Diya Menon | Term 1 Tuition | 14500.00 |
| ADM-2026-0070 | Aryan Kapoor | Term 1 Tuition | 14500.00 |
| ADM-2026-0071 | Myra Verma | Term 1 Tuition | 14500.00 |
| ADM-2026-0072 | Reyansh Khan | Term 1 Tuition | 14500.00 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
