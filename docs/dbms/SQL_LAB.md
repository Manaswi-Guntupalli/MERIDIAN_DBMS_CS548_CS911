# SQL playground

Open **Database Lab → SQL playground** as a principal or administrator.

The editor executes SQL against a private **native PostgreSQL database with pgvector**. A dedicated PostgreSQL instance serves playgrounds; it contains no school records. The website's PostgreSQL connection is never used for editable queries. **Live database evidence** continues to run a fixed catalogue of school-scoped, read-only queries against the website database.

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

- Each authenticated `(schoolId, userId)` gets its own disposable database and restricted login on the dedicated native cluster. Two tabs for the same user share a playground; different users do not.
- Child processes receive only their restricted playground URL, never the provisioning administrator URL, school database URL, JWT key, or provider credentials. PostgreSQL authentication restricts each playground login to its same-named database. Logins have no superuser, role-creation, database-creation, replication, or server-file/program privileges.
- DML, DDL, functions, triggers, explicit transactions, and destructive schema experiments are supported within the disposable database. Server and operating-system administration require privileges playground logins do not have.
- Explicit `BEGIN`/`COMMIT`/`ROLLBACK` can span runs. After an error inside a transaction, run `ROLLBACK;` before continuing. Reset also recovers the whole cluster.
- Databases expire after 15 idle minutes (checked every minute), and are dropped with their restricted login on reset, graceful API shutdown, or query timeout. An abrupt machine/process crash may leave an orphan database; playgrounds are not permanent storage.
- After eight seconds the API terminates the worker and forcibly drops that disposable database, terminating its backend query. The next run provisions fresh demo data. Worker startup has a separate 40-second limit. The API stays responsive while SQL executes.
- At most four playgrounds can exist per API process. Additional users receive an explicit capacity message until an idle cluster expires. SQL Lab endpoints allow 30 requests/minute per client IP, in addition to the application's normal limit.
- Inputs are limited to 20,000 characters. The display includes up to 12 result sets and 500 rows and 100 columns per result, with a one-megabyte cell-text budget and 4,000-character cell limit. Use `LIMIT` for large queries. Workers have a 256 MB V8 heap limit; restricted logins default to 4 MB work memory, a 32 MB temporary-file limit, and a 60-second idle-transaction timeout. These are not a total disk/memory quota. This is an authenticated teaching feature, not a public hostile-code execution service.

## Deployment

Run `npm ci` and the normal application builds. Configure a **separate** pgvector-enabled PostgreSQL cluster with `cluster_name=meridian-sql-lab` and the authentication rules in `database/lab/pg_hba.conf`. Set `SQL_LAB_ADMIN_URL` to its administrator connection, then run `npm run sql-lab:setup`. The provisioner builds a fictional template from the versioned migrations, advanced SQL, integrity constraints, and `server/sql-lab/seed.sql`. It refuses a cluster with the wrong marker. Never point it at the school cluster.

Docker Compose includes this separate service on port 5433. Fresh configuration generates an independent `SQL_LAB_POSTGRES_PASSWORD`; existing configurations must add that value and a matching `SQL_LAB_ADMIN_URL` without changing school credentials. On this computer, `python scripts/setup-native-sql-lab.py` provisions the project-local Windows cluster using `.local/postgresql16`; `npm run start:native` also starts it on subsequent runs. Deploy `server/sql-lab/` alongside `server/dist/`.

## Verification

`server/tests/sql-lab.test.ts` checks all example SQL against real PostgreSQL execution, schema/foreign-key metadata, authorization, input validation, user isolation, website-record preservation, error recovery, transactions across requests, result limits, host-file isolation, reset and slow-query termination.

Browser verification: `node scripts/verify-sql-lab.mjs` (set `BROWSER_EXECUTABLE` if needed; optional `TEST_BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD`). It exercises the editor, selection shortcut, schema explorer, write examples, results, error recovery, CSV, history, reset, live evidence and mobile layout. All write operations in this check target the isolated playground.

Native verification on 9 November 2026 passed **16 SQL Lab backend tests** and **15 browser checks**, including native-engine identity, restricted privileges, cross-database rejection, all examples, reset, timeout cleanup and school-record isolation. The full server regression suite and production builds also passed. Browser results and screenshots are generated under ignored `tmp/sql-lab/`. Existing React 18 deprecation and face-api webpack warnings remain unrelated to this feature.

Isolation reference: [PostgreSQL client authentication](https://www.postgresql.org/docs/16/auth-pg-hba-conf.html).
