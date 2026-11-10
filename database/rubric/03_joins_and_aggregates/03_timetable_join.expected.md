# Expected output: Read the published 7A timetable with teachers and rooms

SQL: [03_timetable_join.sql](03_timetable_join.sql)

Data: Existing published timetable; first six slots for class 7A.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (6 rows)

| class_name | weekday_number | period_number | subject | teacher | room |
| --- | --- | --- | --- | --- | --- |
| 7A | 1 | 3 | Hindi | Mr. Khan | A-102 |
| 7A | 1 | 4 | Science | Ms. Menon | Lab-1 |
| 7A | 1 | 5 | English | Mrs. Sharma | A-102 |
| 7A | 1 | 6 | Mathematics | Mr. Rao | A-102 |
| 7A | 1 | 7 | Social Studies | Mrs. Gupta | A-102 |
| 7A | 2 | 1 | Physical Ed | Mr. Reddy | A-102 |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
