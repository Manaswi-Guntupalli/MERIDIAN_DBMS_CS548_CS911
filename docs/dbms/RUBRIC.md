# Rubric coverage matrix (50 marks)

The supplied two rubric images contain these 14 rows. An implementation mapping is not a guarantee of marks; use TESTING.md for executed evidence.

| # | Component | Marks | Concrete evidence / demonstration |
| --- | --- | ---: | --- |
| 1 | ER diagram | 2 | SCHEMA.md Mermaid ER covers all models, including vector table |
| 2 | Relational schema: keys, relationships, constraints | 3 | SCHEMA.md data dictionary; Prisma schema; relational migration |
| 3 | SQL DDL with constraints | 4 | Versioned migration.sql; advanced.sql CHECK/PK/FK/indexes; demo.sql CREATE/ALTER/DROP |
| 4 | NoSQL/vector database creation | 4 | CREATE EXTENSION vector; KnowledgeItem vector(384); HNSW; real model embeddings |
| 5 | Technology justification | 1 | REPORT.md comparison based on school transactions and semantic document retrieval |
| 6 | DML operations | 4 | Existing operational screens and knowledge create/edit/delete/search; demo.sql rollback-only DML |
| 7 | Nested/correlated/recursive queries and JOIN | 4 | Database Lab query catalogue; database.routes.ts; demo.sql |
| 8 | Advanced SQL: procedure/function, trigger, CTE | 6 | record_fee_payment function; knowledge audit and school-reference triggers; CTE and recursive CTE; summary view; transactions and indexes |
| 9 | NoSQL/vector feature, RUD | 7 | Knowledge Library semantic retrieval, listing, editing/re-embedding, deletion; cosine query; audit revisions |
| 10 | Next.js interface | 3 | client/src/app App Router, browser UI preserved, Next.js production build |
| 11 | API/database integration | 2 | Next HTTP rewrites → Express authenticated routes → Prisma/PostgreSQL and pgvector |
| 12 | Authentication and minimum two roles, database RBAC | 4 | Existing login and six roles; ADMIN write vs TEACHER read in PostgreSQL knowledge RLS; database verification assertions |
| 13 | Documentation, Git/GitHub | 2 | README, REPORT, SCHEMA, DEMO, TESTING, versioned SQL; new repository; original Git backup |
| 14 | Originality, individual contribution, modification/viva | 4 | Base-project attribution and extension description; CONTRIBUTIONS template and viva prompts. Actual two-member contributions and viva remain the team's responsibility |
| | Total | 50 | |

Additional course requirements: two-member team (pending names/assignments), meaningful real-world problem, database-level validation, sensitive settings via env, screenshots, testing, architecture and conclusion appear in the report and setup docs. The original project's features and Flutter API remain part of the implementation, subject to runtime checks in TESTING.md.
