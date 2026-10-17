# Executed verification and limits

## Latest repair verification — 17 October 2026

**147 server + 181 intelligence + 36 Flutter tests passed (364 total)**. Direct database verification passed 29 assertions with rollback-only fixtures. The final headless-browser run passed 40 checks, including authenticated realtime through Next.js, vector CRUD, manual notice drafting, student withdrawal/reactivation/deletion and fee recording. All 16 live service/query checks passed. Production builds, Flutter analysis and the Android debug APK passed.

See [repair-results.json](../audit/repair-results.json), [browser results](../audit/browser-results.json), [fresh screenshots](../audit/screenshots/), [full remediation record and limits](../audit/REMEDIATION.md), and [provider activation](../NOTIFICATIONS.md). Current dependency evidence reports two moderate production findings and five high/four moderate findings when build tools are included. Actual camera/QR/background-push device testing and provider credentials remain pending. Native PostgreSQL CI status is recorded in the repair evidence.

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

## Database assertions

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

Capture fresh UI screenshots and run camera/device workflows in the intended demo environment. Fill actual team identities and contributions, obtain any instructor approval needed for reusing the author's prior project, and prepare each member for modification/viva. These cannot be established by automated tests.
