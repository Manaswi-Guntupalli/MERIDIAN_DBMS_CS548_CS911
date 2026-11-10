# Requirements and rubric coverage

This map uses the supplied five-page project-requirements PDF and the 50-mark evaluation rubric previously provided. The SQL examples below were executed on the actual database; see [VERIFICATION.md](VERIFICATION.md). Links to existing project code/documentation indicate where to demonstrate the other requirements. They are not a guarantee of marks or a fresh test of every application feature.

| Rubric row | Marks | Evidence |
| --- | --- | --- |
| ER diagram | 2 | [Current ER diagrams](ER_DIAGRAM.md), generated from actual foreign keys |
| Relational schema with keys, relationships and constraints | 3 | [Current complete schema/data dictionary](SCHEMA.md), [schema inspection queries](00_design_and_schema/01_tables.sql), [PK/unique indexes](00_design_and_schema/03_primary_and_unique_keys.sql), [FKs](00_design_and_schema/04_foreign_keys.sql), [CHECKs](00_design_and_schema/05_check_constraints.sql) |
| SQL DDL with constraints | 4 | Six [DDL examples](INDEX.md#01_ddl); real referenced tables, CREATE/ALTER/DROP, NOT NULL/PK/FK/UNIQUE/CHECK, index and view; [actual relational migration](../../server/prisma/migrations/202610150001_relational/migration.sql) |
| NoSQL/vector database creation | 4 | [Native vector creation/storage/index example](06_pgvector/01_vector_creation.sql); `vector(384)` and HNSW; [production vector DDL](../advanced.sql) |
| Technology justification | 1 | [Complete technology justification](../../TECHNOLOGY%20JUSTIFICATION.md), [database choice](../../docs/dbms/REPORT.md#database-choice-and-justification), and the vector model/retrieval explanation below |
| DML operations | 4 | Six [DML examples](INDEX.md#02_dml), including INSERT/SELECT/UPDATE/DELETE on actual project tables and a composite-key UPSERT |
| Nested/correlated/recursive queries and JOIN | 4 | Six [join/aggregate examples](INDEX.md#03_joins_and_aggregates) and six [subquery/CTE examples](INDEX.md#04_subqueries_and_ctes), all using existing records |
| Advanced SQL procedure/function, trigger and CTE | 6 | Six [advanced examples](INDEX.md#05_advanced_sql); actual payment function and audit trigger; transaction/savepoint; stored procedure; full-text search; CTE/recursive CTE in category 04; index/view in category 01 |
| NoSQL/vector feature and RUD | 7 | Six [pgvector examples](INDEX.md#06_pgvector); genuine embeddings, cosine retrieval, metadata filtering, update with re-embedding, delete with retained audit history; [Knowledge Library UI](../../client/src/views/Knowledge.tsx) |
| Next.js interface | 3 | [App Router](../../client/src/app), [Database Lab screen](../../client/src/views/DatabaseLab.tsx), [Knowledge Library screen](../../client/src/views/Knowledge.tsx); demonstrate these in the browser |
| Backend/API and database integration | 2 | [Database routes](../../server/src/routes/database.routes.ts), [knowledge routes](../../server/src/routes/knowledge.routes.ts), [knowledge service](../../server/src/services/knowledge.ts), [Prisma schema](../../server/prisma/schema.prisma); connection settings remain in environment configuration |
| Authentication, at least two roles and database role-based access | 4 | [Live role/grant/policy inspection](07_permissions_and_integrity/01_roles_grants_policies.sql), [admin allowed](07_permissions_and_integrity/02_admin_allowed.sql), [teacher read-only](07_permissions_and_integrity/03_teacher_read_only.sql), [student blocked](07_permissions_and_integrity/04_student_cannot_read.sql), [tenant isolation](07_permissions_and_integrity/05_wrong_school_context.sql); [backend authentication](../../server/src/middleware/auth.ts) |
| Documentation and Git/GitHub | 2 | This folder, [main README](../../README.md), [project report](../../docs/dbms/REPORT.md), [demonstration guide](../../docs/dbms/DEMO.md), [existing screenshots](../../docs/screenshots/README.md); demonstrate the repository and actual Git history |
| Originality, individual contribution and modification/viva | 4 | [Named members, responsibility allocation and evidence scope](../../docs/dbms/CONTRIBUTIONS.md), [base-project attribution](../../docs/dbms/REPORT.md#originality-and-contributions); each member explains/modifies database and application work. Separate personal commit attribution is not established for both members |
| Total | 50 | SQL/database evidence is prepared; interface demonstration, authorship and viva remain separate evaluation activities |

## Other requirements in the PDF

- **Meaningful problem, objectives, functional requirements, architecture and conclusion:** [project report](../../docs/dbms/REPORT.md), [system architecture](../../system-architecture.md).
- **Minimum four advanced SQL concepts:** transactions, views, stored functions/procedure, triggers, indexing, full-text search and CTEs are all represented here.
- **Database-level validation:** [constraint failures](01_ddl/04_constraints.sql), [stored-function validation](05_advanced_sql/05_validation_and_failed_payment.sql), and [actual fee/date/student/QR+face checks](07_permissions_and_integrity/06_database_validation.sql). The new Present CHECK is deliberately `NOT VALID` for historical rows, but is enforced on new or updated rows; this example verifies an attempted update is rejected.
- **Test cases and results:** every `.sql` has an adjacent captured-output file; the verifier also asserts payment atomicity, trigger revisions, vector dimensions/norm/ranking, GRANT/REVOKE, denied writes and integrity failures. [verification.json](verification.json) records file hashes and pass counts.
- **Two members and individual contributions:** GUNTUPALLI MANASWI (PES1UG24CS548) and KOTRA SAI SOUMYA SRI (PES1UG24CS911) have a documented responsibility split. [Contribution evidence scope](../../docs/dbms/CONTRIBUTIONS.md#git-and-verification-evidence) distinguishes that allocation from actual personal work/commit attribution; SQL outputs alone cannot establish authorship.

## Why PostgreSQL plus pgvector

Students, classes, fee accounts, payments and attendance have related records that need foreign keys, exact money values, uniqueness, transactions and validation. PostgreSQL is the relational system of record. It also stores policy/document sentence embeddings with metadata in `KnowledgeItem`, using pgvector for similarity search. This meets the PDF's SQL-plus-vector option without introducing a separate synchronization service.

The model is `Xenova/all-MiniLM-L6-v2`, producing normalized 384-dimensional sentence embeddings. Text entries and search questions use the same model. PostgreSQL stores `vector(384)` and ranks using cosine distance `<=>`; `1 - distance` gives a readable similarity score. An HNSW index supports approximate retrieval, and B-tree/GIN indexes support metadata and lexical queries. With only six demo rows the planner may correctly prefer an exact scan; these scripts do not claim HNSW is always selected.

## Permission scope to explain accurately

Application roles such as ADMIN and TEACHER are stored in the relational `User` table. `meridian_knowledge` is a restricted PostgreSQL runtime role with table grants and RLS policies. The backend supplies an authenticated user/school context and switches to that database role within a transaction. The examples explicitly make the same role switch, so the native database's decision is being tested rather than a frontend-only check.

Database RLS currently applies to the Knowledge Library. Other operational endpoints still use backend authorization and the main connection, alongside database integrity constraints. These files do not change that architecture or claim every website permission is enforced by RLS. The configured local `meridian` login is a superuser, so running SELECT directly as that login would bypass RLS; the `SET LOCAL ROLE meridian_knowledge` in permission examples is essential.
