# Live database verification

Captured: **2026-11-10T08:22:50.891Z** (UTC).

- Database: **meridian**, local port **5432**.
- PostgreSQL: **16.15**; pgvector: **0.8.7**.
- SQL files executed successfully: **48/48**.
- Every file executed in a **fresh PostgreSQL connection**, proving it does not require an earlier example.
- Public table data and inspected persistent schema unchanged afterward: **true**, across **44 tables**.
- Each file finished with its own ROLLBACK.
- Machine-readable details and file SHA-256 hashes: [verification.json](verification.json).

Expected outputs are a snapshot of this database, not a promise that future student counts, fees or attendance totals remain identical. Re-run `node database/rubric/run-examples.mjs --verify` from the repository root to compare them. Intentional data changes require inspecting the differences, then `--record` to capture new outputs.

Rollback restores table rows and transactional DDL. PostgreSQL sequence values used by the existing audit trigger can advance even when a transaction rolls back; normal gaps in audit IDs are expected. Audit IDs and timestamps are intentionally excluded from example outputs.
