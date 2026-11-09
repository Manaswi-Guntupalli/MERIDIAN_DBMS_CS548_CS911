# Native PostgreSQL on this computer

Installed and verified on 9 November 2026 for the local Meridian workspace.

The school database runs on **native PostgreSQL 16.15 for Windows**, with **pgvector 0.8.7**, at `127.0.0.1:5432`, database `meridian`. The API and Python analytics use this database. SQL Lab now also uses native PostgreSQL/pgvector, on a separate cluster at `127.0.0.1:5433`, with restricted per-user disposable databases and fictional records.

The official [EDB PostgreSQL binaries](https://www.enterprisedb.com/download-postgresql-binaries) are installed in `.local/postgresql16`. pgvector was compiled locally from the [official v0.8.7 source](https://github.com/pgvector/pgvector/tree/v0.8.7). PostgreSQL listens on loopback and uses SCRAM password authentication. This is a project-local native installation, not a registered Windows service.

## Start after restarting the computer

From the repository root in PowerShell:

```powershell
npm run start:native
npm run check:services
```

Open <http://localhost:5173>. Allow the face model to warm up before checking services. This command uses the existing production build and installed Python dependencies. After source changes, run `npm run build` before restarting the website/API. It does not seed or reset data.

## Preserved data and backups

- All **43 application tables / 5,653 rows** from the working local database were transferred. Every table's ordered COPY output matched its source SHA-256 before commit.
- All **67 foreign keys** were independently checked after transfer.
- The 132 students, 11 teachers, existing users, documents, attendance, fees, vectors, and other application records were preserved.
- Existing JWT and document encryption keys were preserved. The document-storage path remains `tmp/repaired-demo/documents`.
- Native PostgreSQL data: `.local/postgres-data`. Keep this directory; it contains the live database.
- Native database backup: `.local/meridian-migrated.backup` (PostgreSQL custom format).
- Document backup: `.local/document-backup` (four files, SHA-256 checked).
- Before-migration configuration: `.local/config-before-native`.
- Source COPY backup and comparison evidence: `tmp/native-postgres/backup` and `tmp/native-postgres/data-verification.json`.
- The original PGlite store at `tmp/repaired-demo/data` was preserved. Older stores mentioned in previous audit records were not recovered or merged.

Credentials remain in ignored local configuration. Do not commit `.env`, `.local`, or database backups. Keep the document storage and its encryption key together with database backups.

## Verification

- Server: **183 tests / 25 files passed**, using separate native `meridian_test`.
- Analytics: **192 tests passed**.
- Configuration: **5 tests passed**.
- Database verification: **29 assertions passed**, with fixtures rolled back.
- Browser workflows: **40 checks passed**, zero uncaught browser errors, using a separate native database copy. These include 26 principal pages, role guards, mobile layouts, realtime, student edits, fee payment, and semantic CRUD.
- Focused SQL Lab browser verification: **14 checks passed**.
- SQL Lab was subsequently migrated to its own native cluster on port 5433. Its 16 backend tests and 15 browser checks cover native execution, restricted privileges, cross-database rejection, reset and timeout cleanup. See [SQL Lab](dbms/SQL_LAB.md) for the updated architecture.
- Client and server TypeScript checks passed.
- Optimized production build passed; existing React 18 and face-api bundling warnings remain.

Logs and browser screenshots are in `tmp/native-postgres`. Tests do not establish physical camera/QR behavior or external OpenAI/SMS/email/push delivery. Those require their own devices and provider checks.
