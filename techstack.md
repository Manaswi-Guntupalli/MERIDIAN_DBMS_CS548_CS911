# Meridian technology stack

Current inventory checked against manifests, lockfiles, imports, startup scripts and the running native services on **10 November 2026**. For reasons, open [TECHNOLOGY JUSTIFICATION.md](TECHNOLOGY%20JUSTIFICATION.md). For locations, use [PROJECT_LAYOUT.md](PROJECT_LAYOUT.md). For startup, use [README.md](README.md).

## Runtime topology

Four HTTP processes—Next.js, Express, analytics FastAPI and face FastAPI—use two separate PostgreSQL clusters. The Flutter app is another client of Express. Both PostgreSQL clusters have pgvector; the school cluster persists actual app records and the SQL Lab cluster provides fictional, disposable playground databases.

| Runtime | Checked local version / configuration | Port |
| --- | --- | --- |
| Node.js | 22.21.0; npm 11.6.2; `.nvmrc` selects Node 22 | API 4000 / web 5173 |
| PostgreSQL school cluster | 16.15 + pgvector 0.8.7; native Windows installation | 5432 |
| PostgreSQL SQL Lab cluster | Separate native installation data directory; pgvector-enabled template | 5433 |
| Python | 3.14.0 on this workstation; requirements declare Python 3.11+ support | Analytics 8010 / face 8020 |
| Flutter / Dart | 3.38.5 / 3.10.4 verified SDK baseline; Dart constraint `^3.10.4` | API client |
| Optional Compose database installation | `pgvector/pgvector:pg16` for both clusters | 5432 / 5433 |

## Website: resolved Node lockfile versions

The versions below are resolved in [package-lock.json](package-lock.json), not just the minimum/range in [client/package.json](client/package.json).

| Technology | Version | Actual role |
| --- | --- | --- |
| Next.js | 16.4.1 | App Router entry, site serving/build, API/socket polling rewrites |
| React / React DOM | 18.3.1 | Existing interactive school UI |
| TypeScript | 5.9.3 | Frontend/backend static checking |
| React Router DOM | 7.18.4 | Client-side screen routing inside the Next client boundary |
| Tailwind CSS | 3.4.19 | Utility styling, with PostCSS/Autoprefixer |
| TanStack React Query | 5.101.2 | Request caching/refetch; per-account cache lifecycle |
| Zustand | 5.0.14 | Auth/session and UI state |
| Axios | 1.20.0 | JWT-bearing HTTP API requests |
| Framer Motion | 11.18.2 | UI animation |
| Recharts | 2.15.4 | Dashboard/analytics charts |
| qrcode | 1.5.4 | Actual session QR rendering |
| Supporting UI libraries | See client manifest | Lucide icons; React Hook Form/resolvers; Zod; date-fns; clsx/tailwind-merge |

The current scripts run `next dev`, `next build --webpack`, and `next start`. Vite is not the current web server. Next.js serves the existing React Router application through [client-app.tsx](client/src/app/client-app.tsx) and [NextApp.tsx](client/src/NextApp.tsx); this is primarily a client-rendered application.

## Express API and database access

| Technology | Locked version | Actual role |
| --- | --- | --- |
| Express | 4.22.3 | REST endpoints and middleware |
| Prisma / Prisma Client | 5.22.0 | Relational models, migrations and application data access |
| node-postgres (`pg`) | 8.23.1 | SQL Lab/native PostgreSQL sessions and verification utilities |
| Socket.IO | 4.8.3 | Authenticated realtime updates; web/mobile clients use corresponding Socket.IO packages |
| Zod | 3.25.76 | Runtime request validation |
| jsonwebtoken | 9.0.3 | JWT creation/verification |
| bcryptjs | 2.4.3 | Password hashing |
| Middleware/tooling | See server manifest | Helmet, CORS, compression, cookie-parser, express-rate-limit, Morgan, dotenv, Multer, tsx and tsc |

[server/package.json](server/package.json) declares library constraints and commands. [schema.prisma](server/prisma/schema.prisma) identifies PostgreSQL as the datasource. Native SQL extends the schema with constraints, functions, triggers, views, indexes and Knowledge Library RLS.

## Text, documents and vectors

| Technology | Locked version / model | Actual role |
| --- | --- | --- |
| Hugging Face Transformers.js | 4.3.1 | Local Node feature extraction |
| MiniLM model | `Xenova/all-MiniLM-L6-v2` | Normalized mean-pooled 384-D knowledge embeddings |
| pgvector | Local 0.8.7 | Native `KnowledgeItem.embedding vector(384)`, cosine retrieval, HNSW |
| Tesseract.js | 7.0.0 | OCR of scanned form pages in Node |
| PDF.js (`pdfjs-dist`) | 6.4.299 | PDF text/form/page processing |
| Sharp | 0.35.5 | Image preprocessing and diagram raster export |
| `@napi-rs/canvas` | 1.0.11 | Canvas/PDF/image processing utilities |
| PDFKit | 0.19.1 | PDF report exports; currently declared under server devDependencies |
| ExcelJS | 4.4.0 | Excel exports |
| Node crypto | Node built-in | AES-256-GCM document storage envelope, hashes and random tokens |

Semantic text retrieval uses native pgvector. Face matching is a separate 512-D embedding path: `FaceEmbedding.vectorString` is text, with cosine matching in Node. These are not interchangeable embedding spaces or storage implementations.

## Python engines

The requirement files contain **version ranges**, not a complete Python lockfile. This table records installed versions on the working host; installing later on another platform may resolve different compatible versions.

| Package | Local installed version | Service/use |
| --- | --- | --- |
| FastAPI | 0.128.0 | Both engine APIs |
| Uvicorn | 0.40.0 | ASGI server |
| Pydantic | 2.12.5 | Request/value models |
| NumPy | 2.4.0 | Numerical arrays and face vectors |
| pandas | 3.0.1 | Analytics data frames |
| SciPy | 1.16.3 | Statistical calculations/trends |
| scikit-learn | 1.8.0 | IsolationForest and optional model tooling |
| psycopg | 3.3.6 | Read-only PostgreSQL analytics access |
| InsightFace | 1.0.1 | `buffalo_l` face detection/recognition |
| ONNX Runtime | 1.27.0 | CPU model inference |
| opencv-python-headless | 5.0.0.93 | Frame decoding and image-quality operations |
| joblib / pytest / python-dotenv | Requirement-file ranges | Model serialization, tests and configuration |

Sources: [analytics requirements](intelligence/requirements.txt), [face requirements](faceservice/requirements.txt), [analytics database loader](intelligence/app/db.py), [face inference](faceservice/app.py).

Analytics uses interpretable features/statistics and conditional anomaly detection. It does not depend on Redis, LightGBM, Prophet or SHAP. The face service requests ONNX Runtime's CPUExecutionProvider; it does not require a configured CUDA service.

## Flutter companion

The checked SDK is Flutter 3.38.5/Dart 3.10.4. Package constraints are in [pubspec.yaml](flutter_app/pubspec.yaml); resolved mobile packages are in [pubspec.lock](flutter_app/pubspec.lock).

| Area | Packages |
| --- | --- |
| State, routing and networking | flutter_riverpod, go_router, dio |
| Tokens and realtime | flutter_secure_storage, socket_io_client |
| Optical/device input | mobile_scanner, camera |
| UI | fl_chart, google_fonts, intl, cupertino_icons |
| Notifications | flutter_local_notifications; optional firebase_core/firebase_messaging |
| Models/build/tests | freezed_annotation, json_annotation, build_runner, freezed, flutter_test, flutter_lints |

Android uses Java 17 bytecode, the Flutter SDK's Android 36 configuration and an effective API 24 floor in the verified SDK. iOS targets 15+ and requires Mac/Xcode tooling. Release Android HTTP has a loopback-only exception for USB reverse; network API hosts require HTTPS.

## Optional integrations

| Integration | Implementation |
| --- | --- |
| OpenAI | Server SDK 4.104.0; configured prose/report/notice features, with documented fallback/unavailable states |
| SMS/email | Twilio and SendGrid provider calls after real credentials are configured |
| Remote push | firebase-admin 14.5.0 in the API; Firebase packages in Flutter; optional and separately configured |

These providers are not required for local database operations, OCR, knowledge inference or face embeddings. In-app/local notifications do not establish remote delivery while the app is closed.

## Development, verification and diagram tooling

- npm workspaces (`client`, `server`), concurrently, Git and GitHub Actions.
- Vitest **4.1.11** and Supertest for server tests; pytest for Python; flutter_test for mobile.
- Playwright **1.64.1** for browser checks; a compatible installed browser is required.
- PostgreSQL migrations, advanced SQL and independent rollback-only SQL examples.
- Graphviz through isolated `@viz-js/viz` tooling for exact SVG diagrams, with Sharp PNG rendering and XML/image verification. It is not a website runtime dependency.
- PGlite remains under development dependencies for [historical isolated QA](scripts/test-postgres.mjs); the active school and SQL Lab databases are native PostgreSQL.

Test numbers are dated evidence, not dependency versions. Use [TESTING.md](docs/dbms/TESTING.md), [SQL verification](database/rubric/VERIFICATION.md) and [diagram verification](database/rubric/diagrams/VERIFICATION.md) for executed scope.
