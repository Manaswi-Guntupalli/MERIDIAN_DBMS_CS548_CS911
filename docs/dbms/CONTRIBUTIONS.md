# Team members and responsibility allocation

Project: **Meridian - School Operations and Semantic Knowledge Retrieval**.

| Member | SRN |
| --- | --- |
| GUNTUPALLI MANASWI | PES1UG24CS548 |
| KOTRA SAI SOUMYA SRI | PES1UG24CS911 |

## Database, application and verification responsibilities

The following allocation defines each member's scope for implementation review, maintenance, testing and demonstration. File links identify the relevant project work; they do not establish individual historical authorship.

| Area | GUNTUPALLI MANASWI | KOTRA SAI SOUMYA SRI |
| --- | --- | --- |
| Relational design and integrity | Review School, User, Student, Class, Fee/Payment and attendance relations; explain PK/FK/UNIQUE/CHECK constraints and tenant-reference validation. | Review timetable, document, notification and knowledge relations; explain versioning, audit references, vector metadata and ER-to-relational mapping. |
| Standalone SQL demonstrations | Prepare and explain the 24 examples in [schema inspection](../../database/rubric/00_design_and_schema), [DDL](../../database/rubric/01_ddl), [DML](../../database/rubric/02_dml) and [joins/aggregates](../../database/rubric/03_joins_and_aggregates), including their captured outputs. | Prepare and explain the 24 examples in [subqueries/CTEs](../../database/rubric/04_subqueries_and_ctes), [advanced SQL](../../database/rubric/05_advanced_sql), [pgvector](../../database/rubric/06_pgvector) and [permissions/integrity](../../database/rubric/07_permissions_and_integrity), including their captured outputs. |
| Backend workflows | Own review of [authentication/live roles](../../server/src/middleware/auth.ts), student/fee API integration and the [QR + face attendance state machine](../../server/src/services/presence/engine.ts). | Own review of [Knowledge Library embeddings/RLS](../../server/src/services/knowledge.ts), [Lumen intake/commit](../../server/src/services/lumen) and [Kairos timetable workflows](../../server/src/services/kairos). |
| Application integration | Review the Next.js API wiring, student/fee screens, teacher session QR display and student attendance progress on web/mobile. | Review Knowledge Library and SQL Lab screens, Lumen review, timetable rendering and mobile timetable/API parsing. |
| Tests and failure cases | Demonstrate constraints, payment atomicity, live-role enforcement, pending attendance, mismatched proofs, expiry and repeat/concurrent requests. | Demonstrate vector CRUD/RLS/audit, sandbox isolation, document duplicate handling, timetable parsing/day switching and analytics data-sufficiency behavior. |
| Documentation and setup | Maintain the [startup guide](../../README.md), [file lookup](../../PROJECT_LAYOUT.md), relational/attendance explanations and service-readiness checks. | Maintain the [technology justification](../../TECHNOLOGY%20JUSTIFICATION.md), schema/mapping entry points, [rubric map](RUBRIC.md), [demo guide](DEMO.md) and verification-summary presentation. |
| Cross-review and viva | Review Soumya's SQL/vector/timetable scope; execute an additional query modification and trace it from UI to API to PostgreSQL. | Review Manaswi's relational/auth/attendance scope; execute an additional query modification and trace its integrity and transaction behavior. |

## Concrete demonstration ownership

| Member | Database demonstration | Application demonstration |
| --- | --- | --- |
| GUNTUPALLI MANASWI | Explain a rejected constraint, a real JOIN/aggregate and the locked fee-payment function. | Trace teacher session creation, one-factor pending state and same-student QR + face completion; show backend authorization. |
| KOTRA SAI SOUMYA SRI | Explain a recursive CTE, 384-D cosine retrieval, knowledge audit trigger and PostgreSQL teacher write denial. | Show Knowledge Library create/search/update/delete, isolated SQL Lab, Lumen duplicate checks and the published mobile timetable. |

Both members should be able to explain the complete design and modify a query or application behavior during evaluation. [The six-example guide](../../database/rubric/SIX_EXAMPLE_DEMO.md) supplies the shared rehearsal sequence.

## Git and verification evidence

Commit-level attribution for both members has not been established. The existing repository history is retained unchanged; the responsibility allocation above is not a claim that it already records separate commits by both members. Commit URLs should only be attributed when the actual author/co-author record and work support them.

Inspect the real history from the repository root:

```powershell
git shortlog -sne HEAD
git log --format="%h | %an | %ad | %s" --date=short
```

The base Meridian application retains its existing attribution to Manaswi Guntupalli. Shared test results in [TESTING.md](TESTING.md), [SQL verification](../../database/rubric/VERIFICATION.md) and [diagram verification](../../database/rubric/diagrams/VERIFICATION.md) demonstrate project behavior, not which individual wrote every linked file.
