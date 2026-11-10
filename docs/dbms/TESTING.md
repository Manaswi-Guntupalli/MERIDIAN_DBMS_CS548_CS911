# Executed verification and limits

## November verification overview — 10 November 2026

The latest results are below. They were extracted from existing local execution logs/results and checked against the versioned SQL/diagram evidence; the documentation update does not claim a fresh rerun of these suites. A portable [November evidence summary](verification/2026-11-10-summary.json) preserves counts, browser/device check descriptions and SHA-256 provenance for the otherwise ignored raw artifacts.

| Check | Recorded result | Evidence and scope |
| --- | --- | --- |
| Full backend regression | **216 tests passed across 29 files** | `tmp/dual-full-server-tests.log`; covers authentication, integrity, attendance and related application regressions. |
| Flutter regression after timetable repair | **53 tests passed** | `tmp/timetable-flutter-tests.log`; includes six timetable regressions in addition to the earlier 47-test run. |
| Website dual-proof attendance | **11 checks passed** | Actual rendered QR decoding, both verification orders, pending/Present states, realtime updates, duplicate prevention and closed-session rejection. |
| Real face engine/browser flow | **9 checks passed** | Public sample video, three accepted frames, consent, no blink gate, face-only pending and QR completion. This does not test the user's own physical face. |
| Physical phone scanner lifecycle | **4 checks passed** | Rear-camera start, stop/dispose and restart on the connected phone. The evidence explicitly records **no physical optical QR scan** in that check. |
| Physical phone timetable/API | **8 checks passed** | Correct period-label parsing, preserved login, five weekday views and no runtime errors during the check. |
| Android builds after timetable repair | **6 APK artifacts built** | Universal debug/profile/release and split ARMv7/ARM64/x86-64 release; updated ARM64 release was checked on the connected phone. |
| Actual school database SQL examples | **48/48 passed** | [SQL verification](../../database/rubric/VERIFICATION.md), [file hashes/results](../../database/rubric/verification.json). Fresh connection per file; persistent rows/schema unchanged; rollback does not restore sequence counters. |
| Live schema and diagram coverage | **10/10 passed** | [Database/diagram verification](../../database/rubric/diagrams/VERIFICATION.md), read-only catalogue comparison: 43 application tables, 441 columns, 67 FKs. |
| Exported diagram image structure | **32/32 passed** | [Image results](../../database/rubric/diagrams/sources/asset-verification.json); actual SVG/PNG labels, shapes, keys, participation, arrows and validity in both notations. |
| Core service readiness | **6/6 passed** | `npm run check:services`: four HTTP processes, the school DB/pgvector/schema and the dedicated lab cluster/template. This is readiness, not a camera/provider test. |

These are separate runs with different scopes; they should not be summed into a single newly executed test count. [QR + face walkthrough](../QR_ATTENDANCE.md), [face-service evidence](../FACE_RECOGNITION.md), [native PostgreSQL record](../NATIVE_POSTGRES.md) and [notification isolation](../NOTIFICATIONS.md) explain the feature changes. Full raw logs, device XML/screenshots and APKs remain local/generated files; the portable summary is intentionally limited to non-secret result metadata.

### Reproduce and interpret results

Use the root [check/test commands](../../README.md#run-checks-and-tests), the [native startup guide](../../README.md#run-on-the-configured-windows-computer), and [demo walkthrough](DEMO.md). Backend regression tests require a separate `_test` database and do not use school records as fixtures. SQL demonstrations intentionally use the school database with rollback-only writes; running them can advance audit sequences. Live application data changes can legitimately change the saved SQL output snapshot.

The final Flutter analyzer rerun was not executed. Physical optical scanning and the intended enrolled person's accuracy under demo lighting remain hands-on checks. Provider delivery/background push, iOS builds, production load and a fresh Docker installation have their own environment requirements and are not established by this summary. Historical results below remain dated records of earlier revisions.

## Startup/documentation verification — 10 November 2026

The configured native Windows launcher was run again with the existing services healthy. `npm run check:services` passed all six components: website, API, intelligence, loaded face engine, school PostgreSQL + pgvector and the dedicated SQL Lab PostgreSQL/template. The checker now probes the school database directly in a read-only transaction, independently of the API HTTP heartbeat. An unreachable-database smoke check returned exit code 1 with an explicit school-database failure, continued checking the lab and omitted connection credentials.

The current [README](../../README.md), [file lookup](../../PROJECT_LAYOUT.md), [stack inventory](../../techstack.md), [architecture](../../system-architecture.md) and [technology justification](../../TECHNOLOGY%20JUSTIFICATION.md) replace stale operational descriptions. This pass did not rerun the application, Flutter or Python test suites, rebuild APKs, install Docker or test a fresh clone. It did not seed/reset school data. Separate executed [48-query evidence](../../database/rubric/VERIFICATION.md) and [live diagram/image evidence](../../database/rubric/diagrams/VERIFICATION.md) retain their own timestamps and scopes. Historical results below are dated records, not new runs of the current revision.

## SQL playground and report follow-ups — 17 October 2026

The SQL playground passed 13 dedicated backend tests and 14 browser checks, with 12 related authorization/knowledge regression tests also passing. These cover every query-shelf example, user isolation, preservation of website records, real schema and vector queries, transaction rollback, reset, errors, output limits, slow-query termination, CSV, history, keyboard selection, desktop/mobile layouts and the existing live-evidence tab. See [SQL Lab](SQL_LAB.md) for implementation, commands and deployment details.

Report regeneration passed three API tests and nine browser checks. Print export passed A4 portrait, Letter portrait, A4 landscape and a four-page stress report, with all narrative, recommendation and forecast text present inside page bounds and rendered pages visually checked. Both production builds passed. The commands are `node scripts/verify-report-regeneration.mjs`, `node scripts/verify-report-print.mjs`, and `node scripts/verify-sql-lab.mjs` (set `BROWSER_EXECUTABLE` for a local browser if required). These follow-up checks do not claim a new run of the entire intelligence, Flutter or native-PostgreSQL CI suites below.

## Historical repair verification — 17 October 2026

**147 server + 181 intelligence + 36 Flutter tests passed (364 total)**. Direct database verification passed 29 assertions with rollback-only fixtures. The final headless-browser run passed 40 checks, including authenticated realtime through Next.js, vector CRUD, manual notice drafting, student withdrawal/reactivation/deletion and fee recording. All 16 live service/query checks passed. Production builds, Flutter analysis and the Android debug APK passed.

See [repair-results.json](../audit/repair-results.json), [browser results](../audit/browser-results.json), [screenshots from that run](../audit/screenshots/), [full remediation record and limits](../audit/REMEDIATION.md), and [provider activation](../NOTIFICATIONS.md). That run's dependency evidence reported two moderate production findings and five high/four moderate findings when build tools were included. Its camera/QR/background-push limitations describe the October scope; the November table above records subsequent checks. Native PostgreSQL CI status is recorded in the repair evidence.

Native PostgreSQL 16/pgvector verification [passed in run 39048777354](https://github.com/Manaswi-Guntupalli/MERIDIAN_DBMS_CS548_CS911/actions/runs/39048777354), including clean install, build, all 147 server tests, 29 SQL assertions and real embeddings. Tested application source: commit `6e0223e`.

## Earlier migration verification (historical)

Date: 15 October 2026. Host: Windows, Node 22.21.0. Native Docker and PostgreSQL were not installed. Local database checks used PGlite (PostgreSQL compiled to WebAssembly) with its actual pgvector extension, exposed to Prisma through pglite-socket on 127.0.0.1:55432. This is an isolated QA runtime, not the project's deployment database and not a substitute for native PostgreSQL concurrency/load testing.

| Check | Actual result |
| --- | --- |
| PostgreSQL Prisma schema generation | Passed |
| Relational DDL and database/advanced.sql execution | Passed in isolated PostgreSQL/vector runtime |
| Server TypeScript check/build | Passed |
| Next.js 16.4.1 production build | Passed; existing face-api dependency emits a dynamic-require webpack warning |
| Automated server suite | 118/118 tests passed across 16 files after fixes, including atomic payment and knowledge API authorization tests |
| Database verification | 14/14 assertions passed; fixture transaction rolled back |
| Real MiniLM embeddings | Passed: 384 dimensions; absence-policy similarity 0.557567 vs unrelated canteen text 0.100991 for an absence query |
| HTTP end-to-end smoke via Next.js at localhost:5173 | Passed: rewrite, principal/teacher login, real vector create/search/update/delete, revision trigger, teacher write denial, all six SQL query catalogue entries, metadata; temporary knowledge item removed |
| Native Docker clean install / Prisma migrate deploy | Passed in GitHub Actions against pgvector/pgvector:pg16; clean npm ci, production build, full test suite, database assertions and embedding verification all succeeded in [run 38696541448](https://github.com/Manaswi-Guntupalli/MERIDIAN_DBMS_CS548_CS911/actions/runs/38696541448) |
| Browser visual interaction / new screenshots | Not executed: browser automation exposed no available browsers. Existing screenshot catalogue retained and labelled as prior product screenshots |
| Python intelligence tests | 181/181 passed after migrating the live loader to PostgreSQL; live dashboard inference returned HTTP 200 |
| Face service | Health returned HTTP 200 with loaded InsightFace buffalo_l model and 512 dimensions; physical-camera/Flutter-device workflows remain unverified |
| Production dependency audit | No high/critical findings; four moderate findings in legacy react-router / ExcelJS uuid dependency chains remain. Major upgrades were not automatically applied to preserved workflows |

The first test attempts exposed transaction-scoped code that read settings through a separate client, exhausting a one-connection pool. Presence settings now use the current transaction; substitute configuration is loaded before its transaction. Expected uniqueness errors also required a clean connection in the isolated test protocol. The final full suite passed after these fixes. No failed runs are represented as successful verification.

## Earlier database assertion scope

`npm run db:verify` creates isolated fixtures inside one transaction and always rolls back on success:

1. Negative fee CHECK rejection.
2. Cross-school student reference trigger rejection.
3. Stored-function payment updates balance/status.
4. Stored function rejects overpayment.
5. Failed payment leaves no partial payment record.
6. Aggregate view reflects the live balance.
7. Vector create/read and identity cosine similarity.
8. Vector update advances revision through trigger.
9. Teacher database role can read entries.
10. RLS denies teacher UPDATE independently of Express.
11. RLS denies teacher INSERT independently of Express.
12. RLS rejects wrong-school actor context.
13. Vector deletion removes the searchable entry.
14. Audit trigger preserves INSERT/UPDATE/DELETE operations.

The vector identity fixture deliberately uses a known unit vector for mathematical/database assertions. Separately, verify-embeddings.ts and smoke-dbms.mjs execute real MiniLM inference; no random vectors substitute for production embeddings.

## Reproduce with native PostgreSQL

Follow README setup, then run:

```bash
npm run build
npm --prefix server run test
npm run db:verify
```

With the seeded application running, `node scripts/smoke-dbms.mjs` performs real vector/API checks using disposable demo credentials and removes its temporary library entry. Run this only against the local demonstration environment. `npx tsx scripts/verify-embeddings.ts` from server/ verifies the semantic model independently.

The GitHub Actions workflow uses a native pgvector/pgvector:pg16 service to run the clean schema setup, full test suite, database assertions, production build and real embedding check. [The first native CI run completed successfully](https://github.com/Manaswi-Guntupalli/MERIDIAN_DBMS_CS548_CS911/actions/runs/38696541448) for implementation commit `42f2ffc5d1e70f2d02b84b23b8c78d3fdaa6c402`.

## Isolated QA runtime

`npm run test:postgres` starts a local PGlite verification server with the SQL schema and extension already provisioned. Use TEST_DATABASE_URL ending in `_test`, containing `connection_limit=1&pgbouncer=true`, and TEST_SCHEMA_READY=1 to tell the suite that this isolated schema is externally provisioned. Restart this single-process test runtime between large verification runs. The regular Docker setup does not use these settings or skip migrations.

PGlite's socket multiplexing differs from a native server. Native CI verified the migration engine and application/database tests separately. True multi-connection row-lock contention, deployment network-failure recovery and production load remain outside these checks.

## Remaining evaluation actions

Run the physical optical QR and personal enrolled-face checks in the intended demo environment and capture dated screenshots. Team identities and a responsibility allocation are now in [CONTRIBUTIONS.md](CONTRIBUTIONS.md); each member's actual work/commit attribution, modification/viva performance and any instructor approval needed for base-project reuse remain human evaluation evidence.
