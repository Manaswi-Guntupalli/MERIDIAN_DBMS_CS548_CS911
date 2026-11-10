# Diagram verification

Live verification: **2026-11-10T10:13:24.016Z** (UTC). Snapshot: **2026-11-10T08:47:28.892Z**. Database: **meridian:5432**.

**10/10 database and coverage checks passed.** All database access used a read-only transaction; no rows, sequences or schema were changed.

- PASS: Connected to the website meridian:5432 database in a READ ONLY transaction.
- PASS: All 43 application tables and 441 column names, types, defaults and nullable flags match the live catalogue.
- PASS: All primary, foreign and CHECK constraint definitions match the live database.
- PASS: All unique indexes and partial predicates match, including one active published timetable per school.
- PASS: All 67 FK endpoints, delete/update actions and cardinalities match the live catalogue.
- PASS: Four genuine 1:1 profile/configuration links are distinguished from the partial timetable uniqueness rule.
- PASS: Both M:N associative entities retain the real id PK and the actual composite unique pair.
- PASS: Vector storage, polymorphic/audit identifiers and undeclared logical references are represented without invented FKs.
- PASS: Current Mermaid timetable cardinality is correct and obsolete archived mappings are absent.
- PASS: Complete and module diagrams cover every real table and FK exactly once in each notation.

See [live-verification.json](sources/live-verification.json), [snapshot metadata](sources/schema-snapshot.json), and [render manifest](sources/chen-relational-manifest.json). [Image-structure verification](sources/asset-verification.json) separately checks actual SVG shapes, labels, keys, participation lines, arrows, PNG validity and text fit. The complete diagrams are large zoomable posters; module versions support readable report pages.
