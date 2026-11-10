# Setup and evaluation walkthrough

Use [PROJECT_LAYOUT.md](../../PROJECT_LAYOUT.md) as the file lookup: Ctrl+P in VS Code, paste a path, Enter. The [rubric map](RUBRIC.md) links every evaluation row. This walkthrough uses the configured **native PostgreSQL** computer; [fresh-clone setup](../../README.md#run-the-website-from-a-fresh-clone) is a separate alternative.

## 1. Start and check the complete system

From PowerShell:

```powershell
Set-Location 'D:\DBMS MINI PROJECT\MERIDIAN'
npm run start:native
npm run check:services
Start-Process 'http://localhost:5173'
```

Expect six OK lines: website, API, intelligence, loaded face engine, school PostgreSQL + pgvector and SQL Lab PostgreSQL/template. The native launcher needs existing builds, PATH Python packages and initialized clusters. It does not install, build, migrate or seed. Use the [full running guide](../../README.md#run-on-the-configured-windows-computer) for prerequisites, logs and shutdown. Do not start Compose on the same occupied database ports.

Sign in using an existing authorized account. The freshly seeded demo principal is `principal@meridian.school` / `meridian123`; existing passwords may differ. Preserve existing records and configuration; restarting does not require a seed.

## 2. Explain the problem, design and database choice

Open these files in order:

1. [Report](REPORT.md): objectives, functional requirements and why the application goes beyond CRUD.
2. [Technology justification](../../TECHNOLOGY%20JUSTIFICATION.md): PostgreSQL transactions plus semantic knowledge retrieval, Next.js, shared API and separate Python engines.
3. [Complete Chen ER SVG](../../database/rubric/diagrams/chen/01_complete_chen_er.svg).
4. [Complete relational mapping SVG](../../database/rubric/diagrams/relational/01_complete_relational_mapping.svg) and [mapping explanation](../../database/rubric/diagrams/RELATIONAL_MAPPING.md).
5. [Live dictionary](../../database/rubric/SCHEMA.md): 43 application tables, 441 columns and 67 declared FKs in the verified snapshot.
6. [Diagram guide](../../database/rubric/diagrams/README.md): readable module pages, the second notation and editable sources.

Explain one-to-many, genuine one-to-one and associative-table relationships. Internal `_prisma_migrations` is bookkeeping. School-to-Timetable is 1:N; one active published timetable is enforced by a partial unique index.

Show [Prisma models](../../server/prisma/schema.prisma), [migration SQL](../../server/prisma/migrations), [advanced.sql](../../database/advanced.sql) and [integrity.sql](../../database/integrity.sql). PostgreSQL is the actual database; Prisma is an access/migration tool.

## 3. Demonstrate six SQL examples with expected outputs

Use [SIX_EXAMPLE_DEMO.md](../../database/rubric/SIX_EXAMPLE_DEMO.md). Each example has its own question/query and paired captured-output file:

| Concept | SQL file |
| --- | --- |
| Database constraints reject invalid rows | [04_constraints.sql](../../database/rubric/01_ddl/04_constraints.sql) |
| Published timetable JOIN | [03_timetable_join.sql](../../database/rubric/03_joins_and_aggregates/03_timetable_join.sql) |
| Recursive seven-day attendance report | [06_recursive_cte.sql](../../database/rubric/04_subqueries_and_ctes/06_recursive_cte.sql) |
| Atomic payment stored function | [01_stored_payment_function.sql](../../database/rubric/05_advanced_sql/01_stored_payment_function.sql) |
| Semantic similarity with genuine embeddings | [03_vector_similarity_search.sql](../../database/rubric/06_pgvector/03_vector_similarity_search.sql) |
| PostgreSQL teacher read-only enforcement | [03_teacher_read_only.sql](../../database/rubric/07_permissions_and_integrity/03_teacher_read_only.sql) |

For other questions, use the [48-file index](../../database/rubric/INDEX.md): six examples in each of eight categories cover CREATE/ALTER/DROP, INSERT/UPDATE/DELETE/SELECT, grouping/HAVING, nested/correlated queries, procedure/function, trigger, views, indexes, transactions, vector CRUD and grants/RLS.

Connect pgAdmin/psql to the actual school database `meridian`, port 5432, with the existing configured login. Execute each **complete file**, including BEGIN and ROLLBACK. A native psql example from the repository root is:

```powershell
& '.\.local\postgresql16\bin\psql.exe' -h 127.0.0.1 -p 5432 -U meridian -d meridian -v ON_ERROR_STOP=1 -f 'database/rubric/01_ddl/04_constraints.sql'
```

For full comparison:

```powershell
node database/rubric/run-examples.mjs --verify
```

The captured result is 48/48 passing, with persistent rows/schema unchanged. Outputs are dated snapshots: genuine later admissions, payments or attendance can change results. Demonstration writes/DDL roll back, but audit sequences may advance. Do not use `--record` merely to hide an unexplained difference.

## 4. Distinguish website SQL Lab from the school database

Open **Database Lab**, execute its built-in query examples, show results/history, then reset the playground. Explain the dedicated PostgreSQL cluster on port 5433, fictional template and restricted per-user disposable databases.

The standalone rubric files above target the actual school schema on 5432. Do not paste them into the disposable playground and expect matching data. Show [native sandbox implementation](../../server/src/services/nativeSqlLab.ts), [worker](../../server/sql-lab/worker.mjs) and [lab guide](SQL_LAB.md).

## 5. Demonstrate Knowledge Library and database permissions

1. As an administrator/principal, create a clearly labelled demo absence-policy paragraph. First use may download MiniLM; allow it to finish.
2. Search using different wording, such as “What should I do when my child misses class?” Explain title-plus-content embeddings, `Xenova/all-MiniLM-L6-v2`, 384 dimensions, cosine distance and the returned relevance score.
3. Use category filtering during search, then Show all. Show all ignores the search/category controls and lists up to 100 visible school entries, most recently updated first, without semantic ranking.
4. Edit the demo entry, save/re-embed, show revision behavior, then delete it and explain retained audit history. These UI actions are real persistent operations; use the labelled demo entry.
5. Sign in as a teacher: listing/search work, while write API operations are denied. Run/show [teacher SQL denial](../../database/rubric/07_permissions_and_integrity/03_teacher_read_only.sql) and [administrator allowance](../../database/rubric/07_permissions_and_integrity/02_admin_allowed.sql).
6. Explain the NOLOGIN database role, transaction-scoped actor/school settings, GRANT and RLS in [advanced.sql](../../database/advanced.sql). The local database-owner login alone bypasses these policies; the examples deliberately switch to the restricted role.

RLS applies to Knowledge Library. Other workflows use backend role/ownership checks plus database integrity constraints; do not describe all permissions as database RLS. Native pgvector text embeddings are separate from face templates, which currently use PostgreSQL text storage and Node cosine matching.

## 6. Demonstrate mandatory QR + face attendance

Follow the [complete teacher/phone test](../QR_ATTENDANCE.md) and [enrollment instructions](../FACE_RECOGNITION.md).

1. Keep API, school PostgreSQL and the face engine running. Enroll the consenting person under the correct student record.
2. As authorized staff, start that student's class session and project the actual QR.
3. Sign in as that student on the phone and scan: **QR verified, awaiting face**. One proof must not produce Present.
4. Match that same student's enrolled face in the same session: both teacher and student screens should show Present.
5. In a new session, demonstrate the reverse order: face first stays pending, then the student's QR completes attendance.
6. Show that a mismatched face is blocked, rescanning does not duplicate attendance, and the closed/expired QR is rejected.

Legacy manual endpoints cannot bypass the rule to mark Present/Late; Absent/Leave corrections remain available. Face enrollment and a face-only match are separate from attendance completion. The [database validation example](../../database/rubric/07_permissions_and_integrity/06_database_validation.sql) also rejects an incomplete Present verification.

For Android USB setup, follow [README mobile instructions](../../README.md#run-the-flutter-app). Use the actual device ID with `adb reverse tcp:4000 tcp:4000`. Physical optical scanning and personal face accuracy must be checked with the intended camera, lighting and enrolled person.

## 7. Show remaining operational integration

- **Lumen:** process a fictional admission form, review fields/evidence and show commit readiness. Recommitting an already committed document is blocked. A fresh upload with an existing admission number is also blocked; matching name/DOB can produce review findings, but this is not a hard same-person deduplication guarantee if the admission number is changed/removed.
- **Kairos/mobile:** show the published timetable, class/teacher filtering, period labels and weekday tabs. Explain that web/mobile read the same API/database.
- **Fees:** show a real balance and the rollback-only payment-function example. Explain the fee-row lock and atomic Payment/Fee update.
- **Notifications:** read state belongs to the signed-in user; demonstrate account switching. In-app updates do not establish SMS/email/closed-app push delivery.
- **Foresight/Trust:** show available statistical explanations, data-sufficiency/offline states and audit history. Optional external providers need real configuration.

## 8. Present tests, evidence and individual understanding

Open [TESTING.md](TESTING.md) for dated November results and historical records. Show [SQL evidence](../../database/rubric/VERIFICATION.md) and [diagram evidence](../../database/rubric/diagrams/VERIFICATION.md). Commands for reproducing checks are in the root [test guide](../../README.md#run-checks-and-tests). Backend tests require a separate `_test` database.

Capture fresh screenshots with the date/environment; existing screenshots and sample-model automation are not a substitute for the final physical scan. Each member should use the [responsibility allocation](CONTRIBUTIONS.md), show actual attributable work and explain/modify both database and application code. Retain the existing Git history and base-project attribution.
