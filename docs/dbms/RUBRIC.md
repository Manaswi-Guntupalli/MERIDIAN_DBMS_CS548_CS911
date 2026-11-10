# Requirements and evaluation coverage

This guide maps the instructor-supplied **DBMS Level 3 Project Requirements-1.pdf** (five pages, 17 numbered requirements) and the separately supplied **50-mark evaluation rubric** to the current project. It identifies inspectable implementation and dated evidence; it does not guarantee marks, approval or viva performance.

Team: **GUNTUPALLI MANASWI - PES1UG24CS548** and **KOTRA SAI SOUMYA SRI - PES1UG24CS911**. See [responsibility allocation and evidence scope](CONTRIBUTIONS.md).

## 50-mark evaluation matrix

| # | Component | Marks | Files to open and demonstration |
| --- | --- | ---: | --- |
| 1 | ER diagram | 2 | [Complete Chen SVG](../../database/rubric/diagrams/chen/01_complete_chen_er.svg), [diagram/module guide](../../database/rubric/diagrams/README.md); crow's-foot exports are also retained. |
| 2 | Relational schema: keys, relationships, constraints | 3 | [Relational mapping SVG](../../database/rubric/diagrams/relational/01_complete_relational_mapping.svg), [mapping rules](../../database/rubric/diagrams/RELATIONAL_MAPPING.md), [live dictionary](../../database/rubric/SCHEMA.md). Verified snapshot: 43 tables, 441 columns, 67 FKs. |
| 3 | SQL DDL with constraints | 4 | [Six DDL examples and outputs](../../database/rubric/INDEX.md#01_ddl), [migrations](../../server/prisma/migrations), [advanced.sql](../../database/advanced.sql), [integrity.sql](../../database/integrity.sql). Show CREATE/ALTER/DROP and rejected constraints. |
| 4 | NoSQL/vector database creation | 4 | [Vector creation SQL](../../database/rubric/06_pgvector/01_vector_creation.sql), [vector DDL](../../database/advanced.sql): extension, `vector(384)`, metadata and HNSW. PostgreSQL + pgvector implements the SQL-plus-vector option. |
| 5 | Technology justification | 1 | [Complete technology justification](../../TECHNOLOGY%20JUSTIFICATION.md), [report rationale](REPORT.md#database-choice-and-justification), [actual stack](../../techstack.md). |
| 6 | DML operations | 4 | [Six DML examples and outputs](../../database/rubric/INDEX.md#02_dml); operational student/fee workflows and Knowledge Library create/read/update/delete. |
| 7 | Nested/correlated/recursive queries and JOIN | 4 | [Six join/aggregate examples](../../database/rubric/INDEX.md#03_joins_and_aggregates), [six subquery/CTE examples](../../database/rubric/INDEX.md#04_subqueries_and_ctes); show grouping, HAVING, ordering and actual captured rows. |
| 8 | Advanced SQL: procedure/function, trigger, CTE | 6 | [Six advanced examples](../../database/rubric/INDEX.md#05_advanced_sql): payment function, rollback-only procedure, audit trigger and transaction/savepoint; [CTEs](../../database/rubric/04_subqueries_and_ctes), views/indexes and full-text search. |
| 9 | NoSQL/vector feature and RUD | 7 | [Knowledge UI](../../client/src/views/Knowledge.tsx), [embedding/RLS service](../../server/src/services/knowledge.ts), [six vector examples](../../database/rubric/INDEX.md#06_pgvector): real MiniLM embeddings, cosine search, editing/re-embedding, deletion and audit retention. |
| 10 | Next.js interface | 3 | [App Router entry](../../client/src/app), [React application](../../client/src/NextApp.tsx), [Knowledge UI](../../client/src/views/Knowledge.tsx), [Database Lab](../../client/src/views/DatabaseLab.tsx). Demonstrate the running site on 5173. |
| 11 | Backend/API and database integration | 2 | [Next rewrites](../../client/next.config.mjs), [API registry](../../server/src/routes/index.ts), [Prisma connection](../../server/src/lib/prisma.ts), [native vector queries](../../server/src/services/knowledge.ts). Web/mobile use the same authenticated API. |
| 12 | Authentication, at least two roles and database RBAC | 4 | [Backend auth](../../server/src/middleware/auth.ts), [live account checks](../../server/src/lib/live-session.ts), [role/grant/RLS inspection](../../database/rubric/07_permissions_and_integrity/01_roles_grants_policies.sql), [admin CRUD](../../database/rubric/07_permissions_and_integrity/02_admin_allowed.sql), [teacher denial](../../database/rubric/07_permissions_and_integrity/03_teacher_read_only.sql), student/tenant-denial examples. |
| 13 | Documentation and Git/GitHub | 2 | [README](../../README.md), [source lookup](../../PROJECT_LAYOUT.md), [report](REPORT.md), [test evidence](TESTING.md), [demo](DEMO.md), [screenshots](../screenshots/README.md), versioned SQL and actual repository history. |
| 14 | Originality, individual contribution, modification/viva | 4 | [Team identities/responsibilities and attribution scope](CONTRIBUTIONS.md), [base-project attribution](REPORT.md#originality-and-contributions); each member explains and modifies database and application work. Individual commit evidence must reflect actual history. |
| | **Total** | **50** | Technical artifacts and recorded checks support assessment; individual work and viva are assessed separately. |

## All 17 requirements in the PDF

| PDF requirement | Current coverage and evidence |
| --- | --- |
| 1. Unique title and meaningful real-world problem | [Report objectives](REPORT.md#objectives-and-problem): school operations, atomic payments, dual attendance, document review and semantic retrieval. Title uniqueness within the section is an instructor/team check. |
| 2. Two-member team; both database and application responsibilities | [Named members and responsibility matrix](CONTRIBUTIONS.md). Course approval and personally completed work are separate from allocating responsibilities. |
| 3. SQL + NoSQL or SQL + vector | PostgreSQL 16 + native pgvector; [database/vector implementation](../../database/advanced.sql), [technology justification](../../TECHNOLOGY%20JUSTIFICATION.md). |
| 4. ER-to-relational design and vector data model | [Schema entry point](SCHEMA.md), [mapping](../../database/rubric/diagrams/RELATIONAL_MAPPING.md), [vector model/retrieval](REPORT.md#vector-data-model-and-retrieval). |
| 5. CREATE/ALTER/DROP, keys, constraints, indexes and views | [DDL category](../../database/rubric/INDEX.md#01_ddl), real migration and SQL installers. |
| 6. INSERT/UPDATE/DELETE/SELECT and suitable queries | [DML](../../database/rubric/INDEX.md#02_dml), [joins/aggregates](../../database/rubric/INDEX.md#03_joins_and_aggregates), [subqueries](../../database/rubric/INDEX.md#04_subqueries_and_ctes). |
| 7. At least four advanced SQL concepts and a vector feature | Transactions, stored function/procedure, triggers, views, indexing and full-text search; semantic cosine retrieval. [Advanced examples](../../database/rubric/05_advanced_sql), [vector examples](../../database/rubric/06_pgvector). |
| 8. Explain embedding input, model, storage, metric and retrieval | [Report vector section](REPORT.md#vector-data-model-and-retrieval), [fixture provenance](../../database/rubric/fixtures/README.md): focused title/text, MiniLM, 384-D native vectors, cosine, school/category scope and HNSW/exact-scan behavior. |
| 9. Functional Next.js interface | [Next entry](../../client/src/app), [screen routes](../../client/src/App.tsx); forms, tables, filters, dashboards, Knowledge and SQL Lab. |
| 10. Backend/API integration and environment configuration | [Architecture](../../system-architecture.md), [public server env template](../../server/.env.example), [Next configuration](../../client/next.config.mjs); private local credentials are ignored. |
| 11. Backend authentication and minimum two roles | Six live application roles; [middleware](../../server/src/middleware/auth.ts), JWT/password helpers and PostgreSQL knowledge policies. |
| 12. Database-level validation and integrity | [Integrity SQL](../../database/integrity.sql), [constraint demonstrations](../../database/rubric/01_ddl/04_constraints.sql), [payment validation](../../database/rubric/05_advanced_sql/05_validation_and_failed_payment.sql), [actual QR/face and data checks](../../database/rubric/07_permissions_and_integrity/06_database_validation.sql). |
| 13. Soft-copy documentation | [Report](REPORT.md) links objectives, requirements, ER/schema, dictionary, implementation, queries, architecture, screenshots, tests and conclusion; [file guide](../../PROJECT_LAYOUT.md) provides immediate lookup. |
| 14. Git/GitHub, individual commits and suitable README | Current repository and [README](../../README.md); [contribution evidence scope](CONTRIBUTIONS.md#git-and-verification-evidence). Separate individual commit attribution is not established for both members. |
| 15. Final demonstration | [Step-by-step walkthrough](DEMO.md), [six SQL examples](../../database/rubric/SIX_EXAMPLE_DEMO.md), [executed evidence](TESTING.md), individual explanation/modification. |
| 16. Originality and distinct design/implementation | [Base-project and extension attribution](REPORT.md#originality-and-contributions). Instructor assessment of reuse/originality is not established by generated documents or test results. |
| 17. Beyond CRUD; justify technology from the problem | Dual-proof attendance, atomic payments, versioned scheduling, OCR review, local semantic retrieval, database RLS and isolated SQL sessions; [justification](../../TECHNOLOGY%20JUSTIFICATION.md). |

## Verification scope to explain accurately

- [48 standalone SQL files](../../database/rubric/INDEX.md), six per category, each have a separate expected-output file. [Recorded execution](../../database/rubric/VERIFICATION.md) used the actual website database with rollback-only writes/DDL; sequences may advance.
- [Live diagram checks](../../database/rubric/diagrams/VERIFICATION.md) passed 10 database/coverage checks and 32 exported image checks. Both notations remain available.
- [November testing summary](TESTING.md) distinguishes 216 backend tests, 53 Flutter tests, browser/model/device checks, service readiness and historical October evidence. These counts are dated runs, not a new aggregate test suite or a claim that every physical workflow was automated.
- SQL Lab uses separate fictional/disposable PostgreSQL databases on 5433; the rubric files target the actual school database on 5432.
- Database RLS currently protects Knowledge Library. Other routes use backend authorization and PostgreSQL integrity constraints. The local superuser can bypass RLS; demonstrations switch to the restricted role.
- Both QR and matching face are required for a new Present attendance result. Physical optical scanning and the enrolled person's real-camera accuracy still need hands-on validation. External notification providers and iOS require their own environments.
