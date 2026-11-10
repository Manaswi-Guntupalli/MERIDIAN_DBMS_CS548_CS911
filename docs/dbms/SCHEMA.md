# PostgreSQL schema and ER diagrams

The current schema documentation is maintained under `database/rubric/`. Use the verified files below for the report and viva; this page is the stable entry point for older links.

| Required item | Current file |
| --- | --- |
| Complete tables, columns, data types, defaults, nullability and constraints | [Live PostgreSQL data dictionary](../../database/rubric/SCHEMA.md) |
| Complete Chen ER diagram | [Chen SVG](../../database/rubric/diagrams/chen/01_complete_chen_er.svg) |
| ER-to-relational schema mapping | [Horizontal mapping SVG](../../database/rubric/diagrams/relational/01_complete_relational_mapping.svg), [mapping rules and relation definitions](../../database/rubric/diagrams/RELATIONAL_MAPPING.md) |
| Crow's-foot ER and table-box schema | [ER SVG](../../database/rubric/diagrams/01_complete_er_diagram.svg), [schema SVG](../../database/rubric/diagrams/02_complete_relational_schema.svg) |
| Readable module diagrams, PNG copies and editable DOT sources | [Diagram guide](../../database/rubric/diagrams/README.md) |
| Mermaid ER | [Current Mermaid source](../../database/rubric/ER_DIAGRAM.md) |
| Live-database and image verification | [Verification record](../../database/rubric/diagrams/VERIFICATION.md) |

## Schema scope

The verified PostgreSQL catalogue contains **43 application tables, 441 columns and 67 declared foreign keys**. Prisma's `_prisma_migrations` table tracks migration execution and is excluded from application diagrams. Counts describe the dated catalogue snapshot, not an unchanging promise after future migrations.

Both diagram notations describe the same database. The mapping distinguishes actual foreign keys from logical/polymorphic references and preserves real associative-table primary keys and composite unique constraints. School-to-Timetable is 1:N; the partial unique index restricts the active published timetable rather than making the whole relationship 1:1.

## Executable implementation

- [Prisma schema](../../server/prisma/schema.prisma): PostgreSQL datasource and typed relational models used by the backend.
- [Versioned migrations](../../server/prisma/migrations): SQL history, including the mandatory [QR + face proof constraint](../../server/prisma/migrations/202611100002_dual_attendance/migration.sql).
- [advanced.sql](../../database/advanced.sql): native vector table/indexes, database role/RLS, payment function, summary view and knowledge audit trigger.
- [integrity.sql](../../database/integrity.sql): school-reference and calendar/data validation.
- [48 separate SQL examples and captured outputs](../../database/rubric/INDEX.md): inspect and demonstrate the actual schema, constraints and operations.

Prisma is the backend's database-access/migration tool; **PostgreSQL is the actual database**. Native `KnowledgeItem.embedding vector(384)` storage is defined in SQL. Face templates use a separate serialized-text representation and Node matching.

The canonical dictionary includes the newer attendance verification columns. This page intentionally links to that single maintained dictionary instead of reproducing an older, incomplete model listing.
