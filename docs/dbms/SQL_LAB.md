# SQL playground

Open **Database Lab → SQL playground** as a principal or administrator.

The editor executes SQL against a private **PGlite PostgreSQL** cluster with pgvector. PGlite is PostgreSQL compiled to WebAssembly, not a SQL mock or SQLite compatibility layer. The website's PostgreSQL connection is never used for editable queries. The existing **Live database evidence** tab continues to run a fixed catalogue of school-scoped, read-only queries against the website database.

## What is copied?

The **schema definition**, not the website's records. Every new playground applies all of `server/prisma/migrations`, `database/advanced.sql`, and `database/integrity.sql`. `server/sql-lab/seed.sql` adds a fictional school, three users, two teachers, three classes, eight students, eight fees, 56 attendance records, and two illustrative vector entries. Those vectors demonstrate distance calculations; they are explicitly not model-generated semantic embeddings. Credentials in the seed are nonfunctional placeholders.

## Presentation walkthrough

1. Run **Meet the students**. Edit the `WHERE`, `ORDER BY`, or `LIMIT` clauses live.
2. Show **Class fee leaderboard**, **Above the average**, and **Students with unpaid fees** for joins, aggregates, nested queries, and correlated queries.
3. Run **Add a student**, **Update a student**, then **Delete the demo student**. Use result tabs to inspect `RETURNING` rows and counts.
4. Run **A transaction you can undo** to compare the fee before and after `ROLLBACK`.
5. Show **Seven days of attendance**, **Call a payment function**, and **Build a table and trigger**. The schema explorer refreshes after successful statements and includes newly created tables.
6. Run **Vector similarity search** for pgvector's cosine-distance operator.
7. Click **Reset demo → Restore demo database** to discard modifications and restore the original schema and fictional records.

Use **Ctrl+Enter** (macOS: **Cmd+Enter**) to run SQL. Select text first to execute only that selection. Tab inserts two spaces; Escape moves focus out of the editor. The query shelf loads editable examples without executing them. History keeps the last 15 runs while this page remains mounted. CSV exports the currently selected result set and protects spreadsheet cells against formula interpretation.

## Lifecycle and isolation

- Each authenticated `(schoolId, userId)` gets its own in-memory cluster in a separate child process. Two tabs for the same user share a playground; different users do not.
- Child processes receive no website database URL, JWT key, or provider credentials. PGlite's in-memory virtual filesystem contains the demo PostgreSQL cluster, not host files. No network-backed extensions or host filesystem mounts are configured.
- SQL is not filtered to a `SELECT` allowlist: DML, DDL, functions, triggers, explicit transactions, and destructive schema experiments are supported within the disposable cluster. PGlite does not provide every native PostgreSQL server/OS administration capability.
- Explicit `BEGIN`/`COMMIT`/`ROLLBACK` can span runs. After an error inside a transaction, run `ROLLBACK;` before continuing. Reset also recovers the whole cluster.
- Clusters expire after 15 idle minutes (checked every minute), and are discarded on reset, API restart, or query timeout. There is no promise of permanent lab data storage.
- A query is stopped after eight seconds by terminating its child process. The next run provisions fresh demo data. Bootstrap has a separate 40-second limit. The API stays responsive while SQL executes.
- At most four playgrounds can exist per API process. Additional users receive an explicit capacity message until an idle cluster expires. SQL Lab endpoints allow 30 requests/minute per client IP, in addition to the application's normal limit.
- Inputs are limited to 20,000 characters. The display includes up to 12 result sets and 500 rows and 100 columns per result, with a one-megabyte cell-text budget and 4,000-character cell limit. PostgreSQL evaluates the submitted SQL before display truncation; use `LIMIT` for large queries. Workers have a 256 MB V8 heap limit, 4 MB SQL work memory and 32 MB temporary-file limit; these are not a total OS memory quota for WebAssembly. This is an authenticated teaching feature, not a public hostile-code execution service.

## Deployment

Run `npm ci` and the normal application builds. Both PGlite packages are server runtime dependencies. Deploy `server/sql-lab/`, `server/prisma/migrations/`, and `database/` alongside `server/dist/`; the worker reads those versioned SQL files. No extra PostgreSQL service, database password, or external provider is required for the playground. The website remains on its existing PostgreSQL + pgvector database.

## Verification

`server/tests/sql-lab.test.ts` checks all example SQL against real PostgreSQL execution, schema/foreign-key metadata, authorization, input validation, user isolation, website-record preservation, error recovery, transactions across requests, result limits, host-file isolation, reset and slow-query termination.

Browser verification: `node scripts/verify-sql-lab.mjs` (set `BROWSER_EXECUTABLE` if needed; optional `TEST_BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD`). It exercises the editor, selection shortcut, schema explorer, write examples, results, error recovery, CSV, history, reset, live evidence and mobile layout. All write operations in this check target the isolated playground.

Verified on 17 October 2026: **13 SQL Lab backend tests**, **14 browser checks**, and **12 related authorization/knowledge regression tests** passed. The server and Next.js production builds passed. Desktop/mobile screenshots and browser results are generated under ignored `tmp/sql-lab/`. The existing React 18 deprecation and face-api webpack warnings remain unrelated to this feature.

Engine reference: [PGlite: PostgreSQL compiled to WebAssembly](https://pglite.dev/docs/about).
