# Technology justification for Meridian

## Scope and decision basis

Meridian combines related school transactions with document processing, timetable constraints, semantic policy retrieval and session-bound attendance. The selected stack fits those requirements and the current academic demonstration. These are reasoned engineering choices, not a claim that one stack is universally perfect.

The implementation evidence is the [current stack inventory](techstack.md), [service architecture](system-architecture.md), [source map](PROJECT_LAYOUT.md), [live schema](database/rubric/SCHEMA.md) and [executed SQL/diagram verification](database/rubric/diagrams/VERIFICATION.md). Versions follow the repository lockfiles and the recorded local Python/PostgreSQL environment.

## Decision summary

| Requirement/problem | Choice | Why it fits this implementation |
| --- | --- | --- |
| Related people, classes, fees, payments and attendance | PostgreSQL | Database-enforced relationships, exact monetary columns and transactions |
| Find school policies by meaning | pgvector + MiniLM | Text embeddings and similarity retrieval beside relational metadata |
| Functional Next.js web interface | Next.js + existing React screens | Meets the interface requirement while preserving the established UI |
| One backend for web and mobile | Express + TypeScript | Shared authenticated workflow implementation and API contract |
| Maintainable relational CRUD and explicit advanced SQL | Prisma + SQL + `pg` | Typed models/migrations with direct access to database-native features |
| Fast propagation of committed changes | Socket.IO | Existing authenticated realtime connections and client refetch |
| Statistical analysis and local face inference | Python/FastAPI | Appropriate numerical/CV libraries behind small HTTP services |
| Android/iOS companion | Flutter + Riverpod | Shared mobile UI/state layer using the same API |
| Local scanned-form processing | PDF.js, Tesseract.js and Sharp | Text-layer extraction first, OCR/image processing where needed |
| Reproducible demonstrations and proof | Tests, SQL outputs, Graphviz, Git | Inspectable queries, diagrams, source history and executed checks |

## 1. PostgreSQL for the relational system of record

A payment belongs to a fee, a fee belongs to a student, and that student belongs to a school. Treating these as unrelated documents would shift important consistency work into application code. PostgreSQL provides the relational constraints needed for this design; its documented PK/FK, UNIQUE and CHECK mechanisms reject invalid writes at the database boundary. [PostgreSQL 16 constraints](https://www.postgresql.org/docs/16/ddl-constraints.html).

In Meridian, `Fee.amount`/`paid` are exact `numeric(12,2)` values. `record_fee_payment` locks the fee row, rejects invalid/overlarge payments, inserts a Payment and updates the balance together. Attendance/timetable uniqueness, calendar checks and tenant-reference triggers address other real school errors. These make PostgreSQL useful to the workflows rather than merely satisfying a product-name requirement.

Evidence: [Prisma schema](server/prisma/schema.prisma), [versioned DDL](server/prisma/migrations), [advanced SQL](database/advanced.sql), [integrity SQL](database/integrity.sql), [payment demonstration](database/rubric/05_advanced_sql/01_stored_payment_function.sql).

Trade-off: PostgreSQL requires installation, credentials, migrations and backups. The configured workstation uses native PostgreSQL 16; the fresh-clone Compose path packages two pgvector-enabled clusters. The current implementation is PostgreSQL-specific, so switching engines is not a connection-string-only change.

## 2. pgvector and MiniLM for semantic knowledge retrieval

Staff may search “what should I do when my child misses class?” while the saved title says “Reporting student absence.” A semantic representation is useful for this mismatch between wording and meaning. pgvector adds native vector storage and distance operators to PostgreSQL, with exact search and optional approximate indexes. [Official pgvector documentation](https://github.com/pgvector/pgvector).

Meridian computes normalized 384-dimensional `Xenova/all-MiniLM-L6-v2` embeddings from title plus content. It embeds the question with the same model, orders by cosine distance `<=>`, and presents `1 - distance`. School/category metadata, the vector and revision information remain in one database transaction. This avoids maintaining a second remote vector service and synchronizing school permissions between stores.

Evidence: [knowledge service](server/src/services/knowledge.ts), [knowledge endpoints](server/src/routes/knowledge.routes.ts), [native table/HNSW DDL](database/advanced.sql), [genuine embedding fixtures](database/rubric/fixtures/README.md).

Trade-offs: the first inference needs the model download; bounded token input means focused paragraphs work better than whole long documents. Similarity is a relevance score, not a probability. On small tables PostgreSQL can reasonably choose an exact scan instead of HNSW. This feature implements the course's SQL-plus-vector option without adding MongoDB merely to increase the technology count.

## 3. Next.js and React for the website

Next.js is the required web framework and the actual server used by `client/package.json`. The App Router supplies the page/layout entry, and the existing React application is loaded inside a client boundary. Rewrites forward `/api` and Socket.IO polling paths to Express; rewrites are a proxy mechanism documented by Next.js. [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).

Keeping the existing screens preserves school workflows while moving the serving/build layer to Next.js. React Router continues internal SPA navigation; it is not a second web server. This is a practical integration choice for an established multi-screen application.

Evidence: [Next entry](client/src/app/client-app.tsx), [layout](client/src/app/layout.tsx), [React shell](client/src/NextApp.tsx), [rewrites](client/next.config.mjs).

Trade-off: these are primarily client-rendered screens, not a full rewrite to server components. Next/React compatibility and build warnings must be evaluated against the checked lockfile; the project does not claim every dependency is the newest major version.

## 4. TypeScript and Express for shared business workflows

The website and Flutter app need the same login, student scope, QR expiry, payment and attendance rules. Express provides one HTTP layer for these operations. TypeScript expresses route/service contracts and catches many shape errors during build, while Zod validates untrusted request values at runtime.

The mandatory QR + face state machine is implemented once in the backend. A client cannot mark a student present by changing a button label. Shared APIs also mean a mobile timetable or fee payment reads the same school records as the website.

Evidence: [route registry](server/src/routes/index.ts), [request validation](server/src/utils/validate.ts), [attendance engine](server/src/services/presence/engine.ts), [private student progress endpoint](server/src/routes/presence/session.routes.ts).

Trade-off: Express is a separate process that must be started, configured and monitored. It is justified here by the existing backend and the mobile client, rather than duplicating all services inside Next.js route handlers.

## 5. Prisma, explicit SQL and the PostgreSQL driver

Prisma supplies the operational relational models, generated client and versioned migrations. Explicit SQL supplies pgvector storage, functions, triggers, view/index creation and RLS policies. Tagged raw queries in the knowledge service expose the required native vector operators. The `pg` driver also serves the restricted SQL Lab worker and verification tooling.

These roles are complementary: typed application CRUD stays readable while advanced database behavior remains visible as SQL files for inspection and execution. Prisma does not replace PostgreSQL, and schema generation alone does not install every advanced feature.

Evidence: [schema.prisma](server/prisma/schema.prisma), [database installer](server/scripts/install-database.ts), [knowledge raw queries](server/src/services/knowledge.ts), [native SQL Lab](server/src/services/nativeSqlLab.ts), [rubric SQL collection](database/rubric/INDEX.md).

Trade-off: there are two schema sources to maintain—versioned relational migrations and the advanced/integrity SQL installer. `db:setup` deliberately runs both. Runtime SQL must stay scoped and parameterized; dynamic editable SQL is confined to the playground cluster.

## 6. Backend authentication plus native database enforcement

JWT gives web/mobile a shared bearer-token contract; bcryptjs hashes passwords. The API also checks the live User row, role, activity and token version so account revocation/demotion can affect subsequent requests. Backend authorization is essential because frontend hiding is not an access-control boundary.

For KnowledgeItem, the API supplies authenticated actor/school context and switches to `meridian_knowledge` inside a transaction. PostgreSQL RLS allows authorized staff reads and administrator writes. The examples verify allowed admin CRUD, teacher read-only access, student denial and mismatched-school denial directly in PostgreSQL.

Evidence: [JWT/password helpers](server/src/lib/auth.ts), [live session](server/src/lib/live-session.ts), [auth middleware](server/src/middleware/auth.ts), [RLS DDL](database/advanced.sql), [permission examples](database/rubric/07_permissions_and_integrity).

Boundary: six application roles are stored in User; they are not six independent database login accounts. RLS currently protects the knowledge feature. Other routes retain backend authorization plus database integrity rules. The privileged local migration/main connection is not a claim of application-wide least-privilege RLS.

## 7. Socket.IO and client state libraries

Teachers, students and administrators need to see committed attendance and notification updates without repeatedly refreshing a page. Socket.IO supplies the existing authenticated realtime channel. TanStack Query refetches/invalidation manage web server data; Zustand handles auth/UI state. Flutter's Riverpod providers and socket client provide the corresponding mobile behavior.

Evidence: [socket server](server/src/lib/socket.ts), [web realtime hook](client/src/hooks/useRealtime.ts), [per-account query cache](client/src/NextApp.tsx), [Flutter realtime](flutter_app/lib/core/realtime).

Trade-offs: events supplement rather than replace authorized API reads; clients still refetch correct server state. Current Socket.IO is a single-API-process design. Redis is not running as a queue/cache/adapter, so horizontal multi-instance realtime is not a claimed deployment feature.

## 8. Python, FastAPI and the scientific stack

Analytics uses pandas/NumPy for school data frames, SciPy for statistical calculations and scikit-learn for IsolationForest anomaly detection where the observations support it. This is more proportionate to a small school dataset than adding heavy model stacks without evidence that they improve the result. Explanations, sample sufficiency and offline states remain visible.

FastAPI/Pydantic expose typed HTTP request/response handling and automatic API documentation; Uvicorn runs the service. These features fit the small engine interface rather than requiring the main API to reimplement scientific Python code. [FastAPI features](https://fastapi.tiangolo.com/features/).

Evidence: [FastAPI entry](intelligence/app/main.py), [read-only PostgreSQL loader](intelligence/app/db.py), [features](intelligence/app/feature_engineering), [forecasts](intelligence/app/forecasting/forecast.py), [anomalies](intelligence/app/anomaly_detection/isolation.py).

Trade-offs: the Python environment and service add installation/startup work. The loader uses a repeatable-read, read-only PostgreSQL transaction; a dedicated read-only database account can add a further permission boundary. Forecast quality depends on available observations and is not guaranteed by using a model library.

## 9. InsightFace, ONNX Runtime CPU and OpenCV

Face detection/embedding is separate from login, roster logic and attendance completion. The Python engine uses InsightFace `buffalo_l`, OpenCV frame handling and ONNX Runtime's CPU provider. It returns a 512-dimensional template and quality metadata; Node checks model/dimension consistency, matches against the school's enrolled templates, and combines the result with the student's session QR proof.

Evidence: [face service](faceservice/app.py), [Node matching/enrollment](server/src/services/face.ts), [dual-factor engine](server/src/services/presence/engine.ts), [enrollment tests](server/tests/face-enrollment.test.ts).

Trade-offs: model download, camera quality, consent and device testing remain necessary. Removing a blink gate does not create a certified liveness guarantee. Face vectors currently occupy serialized PostgreSQL text fields and are matched in Node; this is different from KnowledgeItem's native pgvector index. Use the upstream model's licensing terms when evaluating deployment beyond the academic demo.

## 10. Flutter, Riverpod and mobile device libraries

Flutter/Dart provides a shared Android/iOS client with role-specific navigation. Riverpod separates state/data providers from screens; Dio connects to the existing API; secure storage holds tokens; mobile_scanner and camera connect to device input. This supports students scanning the actual projected session QR while the teacher uses the website.

Evidence: [pubspec](flutter_app/pubspec.yaml), [Dio client](flutter_app/lib/core/network/dio_client.dart), [token storage](flutter_app/lib/core/storage/token_storage.dart), [scanner screen](flutter_app/lib/features/student/presentation/scan_screen.dart), [mobile test cases](flutter_app/test).

Trade-offs: device addresses and API reachability must be configured at build time. Android USB reverse and loopback HTTP simplify the current local demo; release network hosts require HTTPS. The iOS target needs a Mac and its own signing/build verification. Mobile is a companion and does not implement every administrator web feature.

## 11. Local document processing and storage

PDF.js extracts existing PDF text, avoiding unnecessary OCR. Tesseract.js handles scanned pages, Sharp/canvas support image processing, and the Lumen pipeline keeps field evidence for human correction. PDFKit and ExcelJS generate reports/exports. Node crypto encrypts stored documents with AES-256-GCM, with authenticated API reads rather than a public document directory.

Evidence: [Lumen entry](server/src/services/lumen/index.ts), [ingest](server/src/services/lumen/ingest.ts), [OCR](server/src/services/lumen/ocr.ts), [storage](server/src/services/lumen/storage.ts), [exports](server/src/services/lumen/export.ts).

Trade-offs: OCR is imperfect; confidence and review are necessary. Backups need the matching database, encrypted files and storage key. Local default processing avoids requiring a cloud OCR account; optional configured AI refinement can still send relevant text to a provider.

## 12. Native PostgreSQL, Compose, tests and diagrams

Native PostgreSQL is the installed Windows demo environment. Compose is the separate reproducible fresh-clone alternative for the two database clusters. The SQL Lab cluster isolates arbitrary playground commands from school records, using fictional data, restricted sessions and disposal/reset.

Vitest/Supertest, pytest, Flutter tests and Playwright cover different layers. The 48 standalone SQL files provide inspectable PostgreSQL output. Graphviz/Viz.js creates deterministic Chen/crow's-foot SVG/PNG from actual catalogue metadata; structural and live checks verify names, keys, arrows and cardinalities. Git preserves the implementation and evidence, while actual team authorship must be recorded honestly.

Evidence: [Compose](docker-compose.yml), [native launcher](scripts/start-native.ps1), [six-component health check](scripts/check-services.mjs), [CI workflow](.github/workflows/dbms.yml), [SQL verification](database/rubric/VERIFICATION.md), [diagram verification](database/rubric/diagrams/VERIFICATION.md).

## Optional technologies and deliberate omissions

OpenAI prose assistance, Twilio SMS, SendGrid email and Firebase remote push are optional integrations, not prerequisites for local SQL/attendance/semantic retrieval. Their behavior depends on real configuration; fallback/offline states are documented. An available package or successful in-app notification does not establish external delivery.

The active web/database stack does not use Vite, SQLite, Redis, MongoDB or a separate hosted vector database. PGlite packages remain for legacy isolated QA only. The project avoids adding a service without a demonstrated need. At larger production scale, model evaluation, least-privilege credentials, multi-instance realtime, backups, TLS and operational monitoring would need deployment-specific work; this document describes what is actually implemented now.
