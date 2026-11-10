# Meridian: SQL demonstrations for the DBMS rubric

**48 standalone SQL files: six examples in each of eight categories.** Every SQL file has a matching `*.expected.md` containing the result tables captured from the actual website PostgreSQL database.

Start with the [six-example demonstration](SIX_EXAMPLE_DEMO.md), [complete file index](INDEX.md), and [executed verification](VERIFICATION.md).

| Folder | Six examples cover |
| --- | --- |
| `00_design_and_schema` | Actual tables, column types, primary/unique keys, foreign keys, checks, indexes and fee view |
| `01_ddl` | CREATE TABLE, ALTER TABLE, DROP TABLE, failing constraints, CREATE INDEX and CREATE VIEW |
| `02_dml` | SELECT, INSERT, UPDATE, DELETE, UPSERT and INSERT SELECT |
| `03_joins_and_aggregates` | INNER JOIN, LEFT JOIN, timetable joins, GROUP BY/HAVING, aggregate functions and attendance ranking |
| `04_subqueries_and_ctes` | Nested subquery, correlated EXISTS, correlated scalar query, NOT EXISTS, CTE and recursive CTE |
| `05_advanced_sql` | Actual payment function, stored procedure, actual audit trigger, rollback/savepoint, failed payment and full-text search |
| `06_pgvector` | Extension/table/index creation, genuine vector insertion, cosine retrieval, re-embedding/update, deletion and metadata-filtered retrieval |
| `07_permissions_and_integrity` | Roles/GRANT/REVOKE, administrator CRUD, teacher read-only policy, student denial, tenant isolation and database validation |

The [rubric map](RUBRIC_COVERAGE.md) also points to the ER diagrams, relational schema, technology justification, Next.js/API integration and team-contribution documentation. SQL alone cannot establish a team's individual contribution or viva performance.

## Run and compare all files

From `D:\DBMS MINI PROJECT\MERIDIAN`, with PostgreSQL running:

```powershell
node database/rubric/run-examples.mjs --verify
```

The runner reads the existing connection configuration from `server/.env`; it does not print credentials. No additional npm packages are required after the project's normal installation. It executes the actual `.sql` files, checks key behavior, compares all result tables with the saved expected outputs, and compares persistent table/schema fingerprints before and after the run.

If the services were stopped, start them from the repository root:

```powershell
npm run start:native
```

Expected final verification: `48/48 examples passed; 0 failures. Persistent rows/schema unchanged: true.`

## Run one file in pgAdmin or psql

1. Connect to **database `meridian`, PostgreSQL port `5432`**, using the project's existing local PostgreSQL login. Use the credentials already configured in `server/.env`.
2. Open any `.sql` file in the pgAdmin Query Tool and execute the **whole file**, including `BEGIN` and `ROLLBACK`. Each file is independent; no numbered predecessor is required.
3. Open the adjacent `.expected.md` file and compare every result set. In pgAdmin, use its result-set selector when the script produces multiple result tables.

With the installed native psql executable, this example works from the repository root and prompts for a password if needed:

```powershell
& '.\.local\postgresql16\bin\psql.exe' -h 127.0.0.1 -p 5432 -U meridian -d meridian -v ON_ERROR_STOP=1 -f 'database/rubric/02_dml/01_select.sql'
```

These scripts target the **actual website database**. The website SQL Lab intentionally uses a separate, disposable database cluster and a different schema, so it is not the place to run this collection.

## Existing data and demonstration data

- Read queries use existing school records. Many detailed lists use `LIMIT 6` to keep the output suitable for a viva. Aggregates, schema lists and date ranges return their natural number of rows.
- INSERT/UPDATE/DELETE use clearly named `rubric_demo_...` rows in the actual application tables, related to existing school/student/admin records. Existing students, fees and knowledge entries are not edited or deleted.
- DDL creates a new `public.rubric_demo_roster` table populated from real students and linked through real foreign keys. PostgreSQL disallows a temporary table FK to a permanent table, so this demonstration table is transactionally created and rolled back. DROP applies only to that new table. Views/procedures used just for a demonstration use the session's temporary schema.
- Every file ends in `ROLLBACK`. The expected-output files distinguish existing data from demo data. Audit sequence counters may advance because PostgreSQL sequences do not roll back; no demo audit rows remain.
- The library had no existing entries when these files were prepared. Vector examples insert six demonstration policy/notice/document paragraphs, using genuine `Xenova/all-MiniLM-L6-v2` embeddings, and roll back afterward. The files contain complete vectors, so no model download, API call or earlier seed file is needed to execute them.
- The 384-dimensional fixture vectors use the same title-plus-content input, mean pooling and normalization as the application. Query and revised-text embeddings were computed with the same model. Similarity is a ranking score, not a confidence probability. See [fixture provenance](fixtures/README.md).
- Intentional failures are caught in PL/pgSQL subtransactions. `23505` means uniqueness failure, `23503` FK failure, `23502` NOT NULL failure, `23514` CHECK failure, and `42501` insufficient privilege. The script fails if an expected failure unexpectedly succeeds.

## Snapshot changes and maintenance

Outputs represent the live database at the capture time in [VERIFICATION.md](VERIFICATION.md). If users add students, record attendance, pay fees or change the timetable, corresponding outputs can change. The verifier reports those differences rather than presenting stale values as current.

After reviewing intentional data changes, refresh outputs with:

```powershell
node database/rubric/run-examples.mjs --record
```

Supporting tools are optional:

```powershell
# Refresh the read-only schema dictionary and ER diagrams.
node database/rubric/tools/generate-schema-docs.mjs

# Rebuild SQL files from their definitions and the committed embedding fixtures.
# This overwrites generated SQL files; preserve any intentional manual edits first.
node database/rubric/tools/build-examples.mjs

# Optional model inference to regenerate genuine fixture embeddings.
# First use may download the model; it does not change database rows.
node database/rubric/tools/regenerate-embeddings.mjs
```

If embeddings are regenerated, rebuild the SQL files, then capture and verify the expected outputs again. The normal `--verify` workflow needs neither Python nor an embedding model.
