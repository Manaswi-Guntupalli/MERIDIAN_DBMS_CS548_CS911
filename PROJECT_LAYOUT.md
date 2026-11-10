# Meridian project layout and evaluator file guide

Use this as the **file lookup during the demonstration**. In VS Code, press **Ctrl+P**, paste a relative file path below, and press Enter. Directory links open the feature folder. All paths are relative to the repository root.

For startup, use [README.md](README.md). For technology reasons, open [TECHNOLOGY JUSTIFICATION.md](TECHNOLOGY%20JUSTIFICATION.md). For exact dependencies, open [techstack.md](techstack.md).

For the preloaded Knowledge Library presentation, use [ready-to-search questions and expected results](docs/dbms/KNOWLEDGE_DEMO.md).

## 1. Top-level structure

```text
MERIDIAN/
|-- README.md                           Main setup, startup, service checks, demo entry points
|-- HOW TO RUN.md                       Short operational guide
|-- PROJECT_LAYOUT.md                   This file: where to find implementation/evidence
|-- TECHNOLOGY JUSTIFICATION.md         Reasons and trade-offs for the selected technologies
|-- techstack.md                        Current dependency inventory and version sources
|-- system-architecture.md              Service/data flow and implementation boundaries
|-- package.json                        Root npm commands and workspace definitions
|-- package-lock.json                   Resolved Node dependency versions
|-- docker-compose.yml                  Two PostgreSQL + pgvector services (fresh-clone option)
|-- .env.example                        Public configuration template, not real credentials
|-- .github/workflows/dbms.yml           PostgreSQL CI build/test workflow
|
|-- client/                             Next.js/React website
|   |-- package.json                    Web commands and libraries
|   |-- next.config.mjs                 /api and /socket.io rewrites to Express
|   |-- .env.example                    Web server/realtime configuration template
|   `-- src/
|       |-- app/                        Next App Router layout, catch-all page, client boundary
|       |-- NextApp.tsx                 React Router and per-account QueryClient setup
|       |-- App.tsx                     Screen routes and role guards
|       |-- views/                      Feature screens
|       |-- components/                 Reusable/layout components
|       |-- hooks/                      Realtime, camera and other UI hooks
|       |-- lib/                        Axios, Socket.IO, camera capture and utilities
|       |-- store/                      Zustand authentication and UI state
|       `-- types/                      Shared web types
|
|-- server/                             Express API and school workflows
|   |-- package.json                    API scripts and dependencies
|   |-- .env.example                    Database, JWT, storage, engine and provider settings
|   |-- prisma/
|   |   |-- schema.prisma               Relational models and Prisma relations
|   |   |-- migrations/                 Versioned executable database changes
|   |   `-- seed.ts                     Destructive initial fictional school seed
|   |-- sql-lab/
|   |   |-- provision.mjs               Dedicated cluster/template preparation
|   |   |-- worker.mjs                  Restricted native PostgreSQL SQL execution
|   |   `-- seed.sql                    Fictional playground records
|   |-- src/
|   |   |-- index.ts                    HTTP server, Socket.IO and shutdown entry
|   |   |-- app.ts                      Express middleware, health, API and errors
|   |   |-- config/env.ts               Runtime configuration
|   |   |-- middleware/                 Authentication, authorization and errors
|   |   |-- routes/                     HTTP endpoint handlers
|   |   |-- services/                   Business rules and workflow engines
|   |   |   |-- presence/               QR + face session state machine and reports
|   |   |   |-- kairos/                 Timetable solver, validation and publication
|   |   |   `-- lumen/                  Intake, OCR, extraction, review, storage, commit/export
|   |   `-- lib/                        Prisma, JWT, live sessions, sockets, errors and helpers
|   |-- scripts/                        Database installation/assertions and browser verifiers
|   `-- tests/                          API/integration regressions and test DB setup
|
|-- database/
|   |-- advanced.sql                    pgvector, knowledge RLS, audit trigger, payment function, view
|   |-- integrity.sql                   Tenant-graph and calendar/student validation
|   |-- demo.sql                        Earlier compact rollback-only demonstration
|   |-- init/01-test-db.sql              Docker first-initialization test database creation
|   |-- lab/pg_hba.conf                  Dedicated SQL Lab connection restrictions
|   `-- rubric/
|       |-- INDEX.md                    All 48 SQL questions/purposes and output links
|       |-- SIX_EXAMPLE_DEMO.md          Six ready-to-explain demonstrations
|       |-- 00_design_and_schema/       Actual catalogue inspection examples
|       |-- 01_ddl/                     CREATE, ALTER, DROP, keys, index, view
|       |-- 02_dml/                     SELECT, INSERT, UPDATE, DELETE, UPSERT, INSERT SELECT
|       |-- 03_joins_and_aggregates/     Joins, grouping, HAVING, ranking/aggregates
|       |-- 04_subqueries_and_ctes/     Nested/correlated queries, CTE, recursive CTE
|       |-- 05_advanced_sql/            Function/procedure, trigger, transaction, full-text examples
|       |-- 06_pgvector/                Native vector create/read/update/delete/retrieval
|       |-- 07_permissions_and_integrity/  Database roles, RLS and constraint failures
|       |-- SCHEMA.md                   Complete current live-catalogue dictionary
|       |-- ER_DIAGRAM.md               Corrected Mermaid ER
|       |-- run-examples.mjs            Execute SQL, compare/record expected output
|       |-- VERIFICATION.md             Executed SQL snapshot/evidence
|       |-- tools/                      Diagram/SQL generation and verification tools
|       `-- diagrams/
|           |-- chen/                   Complete and module Chen SVG/PNG
|           |-- relational/             Horizontal schema SVG/PNG
|           |-- modules/                Crow's-foot and table-box module SVG/PNG
|           |-- sources/                Editable DOT, metadata and verification manifests
|           |-- RELATIONAL_MAPPING.md   Rules and all actual relation definitions
|           `-- index.html              Offline image gallery
|
|-- intelligence/                       Python analytics microservice
|   |-- requirements.txt                Python library constraints
|   |-- app/main.py                     Health and dashboard HTTP endpoints
|   |-- app/db.py                       Read-only PostgreSQL data loader
|   |-- app/feature_engineering/        Attendance, finance, staffing and other features
|   |-- app/forecasting/                Statistical forecasts
|   |-- app/anomaly_detection/          IsolationForest and insufficient-data handling
|   |-- app/recommendation_engine/      Ranked, explained actions
|   |-- app/scoring/                    School health calculations
|   `-- tests/                          pytest checks
|
|-- faceservice/                        Face embedding microservice
|   |-- app.py                          Detection, quality checks, 512-D inference, health
|   |-- requirements.txt                FastAPI, InsightFace, ONNX Runtime, OpenCV
|   `-- test_app.py                     Face API/quality tests
|
|-- flutter_app/                        Android/iOS mobile companion
|   |-- README.md                       Device setup, API addresses, APK and iOS instructions
|   |-- pubspec.yaml                    Dart SDK requirement and package constraints
|   |-- pubspec.lock                    Resolved mobile packages
|   |-- lib/main.dart                   Flutter application entry
|   |-- lib/core/                       API, auth-token storage, router, theme and realtime
|   |-- lib/features/                   Auth, family/student/teacher, attendance, timetable, etc.
|   |-- lib/shared/                     Reusable widgets/navigation/UI
|   |-- android/                       Android package/build/transport/permission settings
|   |-- ios/                           iOS project and permissions
|   `-- test/                          Flutter widget/unit regression tests
|
|-- scripts/                            Local configuration/startup/health and browser checks
`-- docs/                               Feature guides, course report, evidence and screenshots
```

## 2. Database concepts: immediate lookup

| What the evaluator asks for | File to open |
| --- | --- |
| Chen entity/relationship/attribute diagram | [Complete Chen SVG](database/rubric/diagrams/chen/01_complete_chen_er.svg), [editable complete DOT](database/rubric/diagrams/sources/chen/complete.dot) |
| ER-to-relational mapping and explanation | [Complete horizontal SVG](database/rubric/diagrams/relational/01_complete_relational_mapping.svg), [mapping rules and definitions](database/rubric/diagrams/RELATIONAL_MAPPING.md) |
| Crow's-foot notation | [Complete SVG](database/rubric/diagrams/01_complete_er_diagram.svg), [DOT](database/rubric/diagrams/sources/01_complete_er_diagram.dot) |
| Keys, column types and actual table names | [Canonical current schema](database/rubric/SCHEMA.md), [Prisma schema](server/prisma/schema.prisma) |
| Original relational CREATE TABLE DDL | [Baseline migration](server/prisma/migrations/202610150001_relational/migration.sql) |
| Subsequent database changes | [All migrations](server/prisma/migrations) |
| Native pgvector table and indexes | [advanced.sql](database/advanced.sql): KnowledgeItem, vector(384), HNSW, GIN and metadata B-tree |
| Payment function and locking | [advanced.sql](database/advanced.sql): `record_fee_payment` |
| View | [advanced.sql](database/advanced.sql): `school_fee_summary` |
| Audit trigger | [advanced.sql](database/advanced.sql): `knowledge_audit_change`, `knowledge_audit` |
| Cross-school integrity and date validation | [integrity.sql](database/integrity.sql) |
| Database role, GRANT and RLS | [advanced.sql](database/advanced.sql), [permission examples](database/rubric/07_permissions_and_integrity) |
| Dual attendance proof CHECK | [202611100002 migration](server/prisma/migrations/202611100002_dual_attendance/migration.sql) |
| A separate query file and expected output | [INDEX.md](database/rubric/INDEX.md): each `.sql` has adjacent `.expected.md` |
| Stored procedure example | [02_stored_procedure.sql](database/rubric/05_advanced_sql/02_stored_procedure.sql): rollback-only demo procedure calling the actual payment function |
| CTE and recursive CTE | [05_cte.sql](database/rubric/04_subqueries_and_ctes/05_cte.sql), [06_recursive_cte.sql](database/rubric/04_subqueries_and_ctes/06_recursive_cte.sql) |
| Vector search with real embeddings | [03_vector_similarity_search.sql](database/rubric/06_pgvector/03_vector_similarity_search.sql), [embedding provenance](database/rubric/fixtures/README.md) |
| SQL test results | [SQL verification](database/rubric/VERIFICATION.md), [machine-readable results](database/rubric/verification.json) |
| Diagram/database consistency results | [Diagram verification](database/rubric/diagrams/VERIFICATION.md), [live results](database/rubric/diagrams/sources/live-verification.json) |

The standalone rubric examples run against the actual school database inside rollback-only transactions. Website SQL Lab is a separate disposable cluster. These two demonstrations intentionally serve different purposes.

## 3. Feature-to-source map

| Feature | Website/mobile entry | Backend/database implementation |
| --- | --- | --- |
| Login and role guards | [NextApp](client/src/NextApp.tsx), [web auth store](client/src/store/auth.ts), [Flutter auth](flutter_app/lib/features/auth) | [auth routes](server/src/routes/auth.routes.ts), [middleware](server/src/middleware/auth.ts), [live sessions](server/src/lib/live-session.ts), [JWT/password helpers](server/src/lib/auth.ts) |
| Students and admissions | [Students UI](client/src/views/Students.tsx), [mobile students](flutter_app/lib/features/students) | [student routes](server/src/routes/students.routes.ts), [Lumen commit](server/src/services/lumen/commit.ts) |
| Fees and payments | [Fees UI](client/src/views/Fees.tsx) | [fee routes](server/src/routes/fees.routes.ts), [payment SQL function](database/advanced.sql), [fee tests](server/tests/fees.test.ts) |
| Teacher-started attendance and QR | [session UI](client/src/views/presence/Sessions.tsx), [live QR screen](client/src/views/presence/AttendanceSessionLive.tsx), [mobile scanner](flutter_app/lib/features/student/presentation/scan_screen.dart) | [session routes](server/src/routes/presence/session.routes.ts), [token/session lifecycle](server/src/services/presence/session.ts) |
| Required QR + face completion | [web scan](client/src/views/ScanAttendance.tsx), [mobile QR transport](flutter_app/lib/features/student/data/attendance_qr.dart) | [state machine](server/src/services/presence/engine.ts), [dual-factor tests](server/tests/dual-attendance.test.ts), [database migration](server/prisma/migrations/202611100002_dual_attendance/migration.sql) |
| Face enrollment/recognition | [FaceRecognition UI](client/src/views/FaceRecognition.tsx), [camera capture](client/src/lib/camera.ts) | [face routes](server/src/routes/face.routes.ts), [Node cosine matching/storage](server/src/services/face.ts), [Python inference](faceservice/app.py) |
| Attendance exports | [summary UI](client/src/views/presence/AttendanceSummary.tsx) | [report builder](server/src/services/presence/report.ts) |
| Knowledge Library | [Knowledge UI](client/src/views/Knowledge.tsx) | [knowledge routes](server/src/routes/knowledge.routes.ts), [embeddings/RLS context](server/src/services/knowledge.ts), [vector DDL](database/advanced.sql), [tests](server/tests/knowledge.test.ts) |
| SQL Lab | [DatabaseLab UI](client/src/views/DatabaseLab.tsx) | [routes](server/src/routes/database.routes.ts), [session orchestrator](server/src/services/sqlLab.ts), [native DB isolation](server/src/services/nativeSqlLab.ts), [worker](server/sql-lab/worker.mjs), [tests](server/tests/sql-lab.test.ts) |
| Lumen PDF/OCR pipeline | [Lumen UI](client/src/views/Lumen.tsx) | [orchestrator](server/src/services/lumen/index.ts), [ingest](server/src/services/lumen/ingest.ts), [OCR](server/src/services/lumen/ocr.ts), [extract](server/src/services/lumen/extract.ts), [encrypted storage](server/src/services/lumen/storage.ts) |
| Kairos timetable | [Kairos UI](client/src/views/Kairos.tsx), [timetable grid](client/src/views/kairos/TimetableGrid.tsx), [mobile timetable](flutter_app/lib/features/timetable) | [routes](server/src/routes/timetable.routes.ts), [solver](server/src/services/kairos/engine.ts), [validation](server/src/services/kairos/validate.ts), [workflow](server/src/services/kairos/workflow.ts), [substitutes](server/src/services/kairos/substitute.ts) |
| Dashboard intelligence | [Dashboard UI](client/src/views/Dashboard.tsx) | [Node bridge](server/src/services/intelligence.ts), [FastAPI](intelligence/app/main.py), [read-only loader](intelligence/app/db.py), [inference](intelligence/app/inference/engine.py) |
| Realtime updates | [web hook](client/src/hooks/useRealtime.ts), [mobile realtime](flutter_app/lib/core/realtime) | [Socket.IO server](server/src/lib/socket.ts) |
| Read/unread notifications | [notification routes](server/src/routes/notifications.routes.ts), [mobile notifications](flutter_app/lib/features/notifications) | [notification service](server/src/services/notifications.ts), [isolation tests](server/tests/notification-isolation.test.ts) |
| Events, audit and selected undo | [Trust routes](server/src/routes/trust.routes.ts) | [event store](server/src/services/eventStore.ts), [trust ledger](server/src/services/trustLedger.ts) |
| Emergency coordination | [mobile emergency](flutter_app/lib/features/emergency) | [emergency routes](server/src/routes/emergency.routes.ts), [service](server/src/services/emergency.ts) |

## 4. Startup, configuration and verification files

| Purpose | File |
| --- | --- |
| Root commands | [package.json](package.json) |
| Start the configured native Windows installation | [start-native.ps1](scripts/start-native.ps1) |
| Check four HTTP processes and both PostgreSQL clusters | [check-services.mjs](scripts/check-services.mjs) |
| Fresh local environment generation | [configure-local.mjs](scripts/configure-local.mjs) |
| PostgreSQL containers and persistent volumes | [docker-compose.yml](docker-compose.yml) |
| Native installation record | [NATIVE_POSTGRES.md](docs/NATIVE_POSTGRES.md) |
| Dedicated native SQL Lab provisioning | [setup-native-sql-lab.py](scripts/setup-native-sql-lab.py), [provision.mjs](server/sql-lab/provision.mjs) |
| Frontend/backend address wiring | [next.config.mjs](client/next.config.mjs), [env.ts](server/src/config/env.ts), [Flutter env.dart](flutter_app/lib/core/config/env.dart) |
| Public env templates to show on screen | [.env.example](.env.example), [server/.env.example](server/.env.example), [client/.env.example](client/.env.example) |
| Backend test database guard/setup | [db-url.ts](server/tests/db-url.ts), [globalSetup.ts](server/tests/globalSetup.ts), [Vitest config](server/vitest.config.ts) |
| PostgreSQL feature assertions | [verify-database.ts](server/scripts/verify-database.ts) |
| QR browser verification | [verify-qr-browser.ts](server/scripts/verify-qr-browser.ts) |
| Face browser verification | [verify-face-browser.ts](server/scripts/verify-face-browser.ts) |
| Mobile regressions | [flutter_app/test](flutter_app/test) |
| Analytics regressions | [intelligence/tests](intelligence/tests) |
| CI | [dbms.yml](.github/workflows/dbms.yml) |
| Hardware demo steps | [QR + face](docs/QR_ATTENDANCE.md), [enrollment](docs/FACE_RECOGNITION.md), [mobile setup](flutter_app/README.md) |

## 5. Source files versus local/generated files

| Location | Meaning |
| --- | --- |
| `server/dist/`, `client/.next/`, `flutter_app/build/` | Generated builds; source changes require rebuilds |
| `node_modules/`, Python `.venv/`, Flutter `.dart_tool/` | Installed/generated dependencies, not authored application logic |
| `.local/postgres-data/` | Actual native school database files on this computer; retain them |
| `.local/postgres-lab-data/` | Separate native playground cluster and template |
| `.local/*-error.log`, `.local/*.log` | Background service/database logs |
| `.local/started-processes.json` | Runtime PID record; inspect before stopping background processes |
| `.env`, `server/.env`, `client/.env.local` | Private local configuration; show templates during presentation |
| Configured `LUMEN_STORAGE_DIR` | Encrypted document files; keep the corresponding storage key and database together |
| `tmp/` | Ignored tooling/evidence **and, on this workstation, live document storage**; never blanket-delete it |

Current canonical database diagrams and dictionary are under `database/rubric/`. [docs/dbms/SCHEMA.md](docs/dbms/SCHEMA.md) now redirects older documentation links to that maintained dictionary, both diagram notations and the mapping guide. The [course demo](docs/dbms/DEMO.md), [rubric map](docs/dbms/RUBRIC.md), [November tests](docs/dbms/TESTING.md) and [team responsibilities](docs/dbms/CONTRIBUTIONS.md) provide the submission walkthrough.
