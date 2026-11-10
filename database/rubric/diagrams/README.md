# Saved ER diagrams and relational schema images

This folder contains the current verified **Chen** and **crow's-foot** ER notations, with **horizontal** and **table-box** relational schema mappings. The Chen and horizontal versions follow the supplied visual references. All artwork comes from the actual website database catalogue; it contains schema metadata, not student records or credentials. Obsolete archived mappings have been removed.

## Open these first

- **Chen ER diagram:** [SVG](chen/01_complete_chen_er.svg) / [PNG](chen/01_complete_chen_er.png).
- **Relational schema mapping:** [SVG](relational/01_complete_relational_mapping.svg) / [PNG](relational/01_complete_relational_mapping.png).
- **Mapping explanation and all relation definitions:** [RELATIONAL_MAPPING.md](RELATIONAL_MAPPING.md).
- **Local image gallery:** [index.html](index.html). Open this file in a browser, then choose an image to view/zoom.
- **Verification against live PostgreSQL and image structure:** [VERIFICATION.md](VERIFICATION.md).

The complete diagrams include **43 tables, 441 mapped attributes and 67 declared foreign-key relationships**. Chen uses 374 non-FK attribute ovals; the remaining 67 attributes appear as relationships and then FK cells in the relational image. SVG retains sharp text at any zoom. The full diagram is a large poster; for a report or viva use the module images below at a readable scale.

## Module images

| Module | Chen ER | Horizontal relational schema |
| --- | --- | --- |
| Identity and enrolment | [SVG](chen/modules/01_identity.svg) / [PNG](chen/modules/01_identity.png) | [SVG](relational/modules/01_identity.svg) / [PNG](relational/modules/01_identity.png) |
| Academics, spaces and scheduling | [SVG](chen/modules/02_academics.svg) / [PNG](chen/modules/02_academics.png) | [SVG](relational/modules/02_academics.svg) / [PNG](relational/modules/02_academics.png) |
| Attendance and biometrics | [SVG](chen/modules/03_attendance.svg) / [PNG](chen/modules/03_attendance.png) | [SVG](relational/modules/03_attendance.svg) / [PNG](relational/modules/03_attendance.png) |
| Document intake and extraction | [SVG](chen/modules/04_documents.svg) / [PNG](chen/modules/04_documents.png) | [SVG](relational/modules/04_documents.svg) / [PNG](relational/modules/04_documents.png) |
| Fees and payments | [SVG](chen/modules/05_fees.svg) / [PNG](chen/modules/05_fees.png) | [SVG](relational/modules/05_fees.svg) / [PNG](relational/modules/05_fees.png) |
| Communication and school safety | [SVG](chen/modules/06_community.svg) / [PNG](chen/modules/06_community.png) | [SVG](relational/modules/06_community.svg) / [PNG](relational/modules/06_community.png) |
| Knowledge, analytics and audit | [SVG](chen/modules/07_knowledge.svg) / [PNG](chen/modules/07_knowledge.png) | [SVG](relational/modules/07_knowledge.svg) / [PNG](relational/modules/07_knowledge.png) |

## Crow's-foot notation and table-box schema (current)

- [Complete crow's-foot ER](01_complete_er_diagram.svg) / [PNG](01_complete_er_diagram.png).
- [Complete table-box relational schema](02_complete_relational_schema.svg) / [PNG](02_complete_relational_schema.png).
- Editable Graphviz sources: [complete ER DOT](sources/01_complete_er_diagram.dot) and [complete schema DOT](sources/02_complete_relational_schema.dot).
- Editable Chen sources: [complete DOT](sources/chen/complete.dot) and [module DOT files](sources/chen).

| Module | Crow's-foot ER | Table-box relational schema |
| --- | --- | --- |
| Identity and enrolment | [SVG](modules/01_identity_er.svg) / [PNG](modules/01_identity_er.png) | [SVG](modules/01_identity_schema.svg) / [PNG](modules/01_identity_schema.png) |
| Academics, spaces and scheduling | [SVG](modules/02_academics_er.svg) / [PNG](modules/02_academics_er.png) | [SVG](modules/02_academics_schema.svg) / [PNG](modules/02_academics_schema.png) |
| Attendance and biometrics | [SVG](modules/03_attendance_er.svg) / [PNG](modules/03_attendance_er.png) | [SVG](modules/03_attendance_schema.svg) / [PNG](modules/03_attendance_schema.png) |
| Document intake and extraction | [SVG](modules/04_documents_er.svg) / [PNG](modules/04_documents_er.png) | [SVG](modules/04_documents_schema.svg) / [PNG](modules/04_documents_schema.png) |
| Fees and payments | [SVG](modules/05_fees_er.svg) / [PNG](modules/05_fees_er.png) | [SVG](modules/05_fees_schema.svg) / [PNG](modules/05_fees_schema.png) |
| Communication and school safety | [SVG](modules/06_community_er.svg) / [PNG](modules/06_community_er.png) | [SVG](modules/06_community_schema.svg) / [PNG](modules/06_community_schema.png) |
| Knowledge, analytics and audit | [SVG](modules/07_knowledge_er.svg) / [PNG](modules/07_knowledge_er.png) | [SVG](modules/07_knowledge_schema.svg) / [PNG](modules/07_knowledge_schema.png) |

Both notations describe the same current database. The corrected [Mermaid ER](../ER_DIAGRAM.md) and [schema dictionary](../SCHEMA.md) remain available.

## Accuracy choices

The Chen design uses blue rectangles, orange diamonds, green ovals, underlined PKs, red cardinalities, and double lines for required child participation. The mapping uses horizontal relation rows, PK underlining, coloured FK cells and arrows pointing to the referenced key. Actual id PKs, composite uniqueness and FK nullability are retained. A logical ID without a declared FK is not drawn as a solid FK arrow. See the mapping guide for the audit and biometric-reference cases.

All database reads used a read-only transaction. This work does not seed entries, advance audit sequences, edit records or migrate the database. Schema documents/images are a snapshot; regenerate after intentional schema changes.

## Rebuild from the actual database

Run from the repository root after the normal project dependencies are installed and PostgreSQL is running:

```powershell
npm install --prefix tmp/er-render-tools --no-save --package-lock=false --ignore-scripts --no-audit --no-fund @viz-js/viz@3.31.0
node database/rubric/tools/render-diagrams.mjs
node database/rubric/tools/render-chen-and-relations.mjs
node database/rubric/tools/write-diagram-guide.mjs
node database/rubric/tools/verify-diagrams.mjs
python database/rubric/tools/verify-diagram-assets.py
```

The Graphviz renderer is isolated under ignored tmp tooling; no application dependency was added. SVG/PNG exports, DOT sources, snapshot metadata and manifests are saved here. Rendering uses [Viz.js](https://viz-js.com/api/); crow's-foot exports use [Graphviz arrow primitives](https://graphviz.org/docs/attr-types/arrowType/).
