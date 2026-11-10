# Six examples to show in the demonstration

Execute each complete file on the actual `meridian` database, port `5432`. Each is independent and ends with `ROLLBACK`. Open its paired expected-output file to compare the complete result.

## 1. CREATE TABLE and test its constraints

[SQL](01_ddl/04_constraints.sql) | [Captured output](01_ddl/04_constraints.expected.md)

The example creates a new roster from six real students, with foreign keys to the actual `Student` and `School` tables. It then attempts invalid changes:

| Test | Expected SQLSTATE |
| --- | --- |
| Duplicate primary key | `23505` |
| Missing referenced student | `23503` |
| Zero roll number | `23514` |
| NULL student name | `23502` |

Explain that PostgreSQL rejects these writes even without the website. The new demonstration table is rolled back.

## 2. Read the actual published timetable with JOINs

[SQL](03_joins_and_aggregates/03_timetable_join.sql) | [Captured output](03_joins_and_aggregates/03_timetable_join.expected.md)

The query joins the published timetable, slots, classes, subjects, teachers, user names and optional rooms. It returns six real slots for **7A**. In the captured database, the first slot is weekday **1**, period **3**, **Hindi**, **Mr. Khan**, room **A-102**. Weekday 1 means Monday.

Explain why the room uses LEFT JOIN: an unassigned room should not hide a valid lesson.

## 3. Generate a seven-day report with a recursive CTE

[SQL](04_subqueries_and_ctes/06_recursive_cte.sql) | [Captured output](04_subqueries_and_ctes/06_recursive_cte.expected.md)

The base term starts six days before the last recorded attendance date. The recursive term adds one day until that last date. LEFT JOIN preserves dates with zero records. The result has **seven ordered dates**, with actual recorded/attended counts in the paired output file.

Explain that the report is anchored to recorded data, so opening it on a different day does not automatically move its date window.

## 4. Pay a demonstration fee atomically

[SQL](05_advanced_sql/01_stored_payment_function.sql) | [Captured output](05_advanced_sql/01_stored_payment_function.expected.md)

The file creates a **demo fee** for an existing student, then calls the application's actual `record_fee_payment` function:

| Amount | Paid after call | Outstanding | Status | Payment rows |
| --- | --- | --- | --- | --- |
| 1000.00 | 250.00 | 750.00 | PARTIAL | 1 |

Explain the `SELECT ... FOR UPDATE` inside the installed function: it serializes payers of the same fee while the payment row and balance are updated together. The example verifies the resulting values; it is not itself a two-connection concurrency stress test. The fee and payment are rolled back.

## 5. Search by meaning with genuine pgvector embeddings

[SQL](06_pgvector/03_vector_similarity_search.sql) | [Captured output](06_pgvector/03_vector_similarity_search.expected.md)

Search question: **What should I do when my child misses class?**

The file inserts six demonstration paragraphs with genuine MiniLM embeddings into the actual `KnowledgeItem` table and performs cosine retrieval. The captured top result is **Reporting student absence**, with similarity **0.569458**. It ranks above the emergency, timetable, library, fees and lab paragraphs.

Explain that the score is computed by PostgreSQL as `1 - (embedding <=> query_vector)`. It measures ranking similarity and is not a 56.95% probability of correctness. These demonstration entries are rolled back.

## 6. Prove teacher permissions in PostgreSQL

[SQL](07_permissions_and_integrity/03_teacher_read_only.sql) | [Captured output](07_permissions_and_integrity/03_teacher_read_only.expected.md)

The script reads an actual teacher identity, switches to the restricted PostgreSQL role, and attempts library operations:

| Check | Expected result |
| --- | --- |
| Database role | `meridian_knowledge` |
| Application role from User table | `TEACHER` |
| Visible demo entries | 6 |
| Updated rows | 0 |
| Deleted rows | 0 |
| Rejected INSERT SQLSTATE | `42501` |

Explain that RLS hides disallowed UPDATE/DELETE targets, so those commands affect zero rows; INSERT instead raises an insufficient-privilege error. The matching [administrator example](07_permissions_and_integrity/02_admin_allowed.sql) demonstrates allowed CRUD.

For the attendance feature, also show [actual database validation](07_permissions_and_integrity/06_database_validation.sql): an active QR-only session and a Present verification missing QR/face proofs both fail with `23514`.

The [full index](INDEX.md) contains all 48 examples, including separate INSERT, UPDATE, DELETE, ALTER, DROP, GROUP BY/HAVING, nested/correlated queries, triggers, GRANT/REVOKE, vector update/delete and full-text search files.
