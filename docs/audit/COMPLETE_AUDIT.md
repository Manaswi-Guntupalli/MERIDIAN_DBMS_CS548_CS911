# Meridian complete project audit

**Audit date: 15 October 2026. Audited implementation: `5e20489`.**

**Conclusion: the project is functional in many areas, but it is not working perfectly and cannot currently be described as fully compliant with every guideline.** This audit reproduced **17 defect categories: nine high-priority authorization/data-integrity issues and eight medium-priority functional issues**. Two additional gaps were confirmed by source/documentation review. No application behavior was changed to hide or fix these findings.

The existing automated tests all passed. Their success does not invalidate the failures reproduced below: those tests do not exercise these particular boundaries.

## What was actually checked

| Verification | Result |
| --- | --- |
| Repository route inventory | 146 routes: 71 GET, 58 POST, 6 PUT, 6 PATCH, 5 DELETE |
| Server test suite | **118 passed**, 16 files |
| Python intelligence suite | **181 passed**; one pytest cache-write warning |
| Flutter widget/unit suite | **36 passed** |
| Total automated tests | **335 passed** |
| Server + Next.js production build | Passed; existing face-api dynamic-require webpack warning remains |
| Flutter static analysis | Passed: no issues found |
| Android debug APK | **Built successfully**, `flutter_app/build/app/outputs/flutter-apk/app-debug.apk` |
| Native SQL DDL/DML demonstration script | Executed against the isolated PostgreSQL/vector runtime; transaction rolled back |
| Database verification script | **14 assertions passed**, rollback-only fixtures |
| API read sweep | 71 GET routes inventoried; two workflow-specific GET paths were left to their existing suites/source review; the remaining paths were exercised with populated audit fixtures |
| Targeted scenarios | Auth lifecycle, role boundaries, student CRUD/deletion, fees, knowledge CRUD/search/import, source provenance, notices, exports, PDF extraction, scanned JPEG OCR, simulator, attendance undo, Socket.IO, tenant references and closed-day Digital Twin |
| Scanned JPEG OCR | Completed in REVIEW with **7 fields read** and 524 characters of extracted text |
| Digital PDF processing | Upload accepted and asynchronous extraction completed in REVIEW |
| Face service | Real blank-frame inference returned HTTP 200, `ok=true`, `found=false` |
| Browser visual/click-through testing | **Not available**: browser inventory empty; native Computer Use pipe unavailable |
| Physical Android/iOS camera, QR and background notification tests | **Not available**: no physical mobile device connected |

Runtime mutations used a **separate audit database on port 55433 and separate document storage**. The running school demo database was not reset. No real SMS, email or remote push was sent. Password hashes, tokens and encryption keys are excluded from the evidence.

The local audit runtime is PGlite with the real PostgreSQL engine and pgvector extension. It is useful for functional checks but has a multiplexed socket implementation. The repository's native PostgreSQL CI previously passed; this audit does not claim that every newly discovered scenario was separately rerun on a native PostgreSQL server. Where the socket reports a connector/protocol error after a constraint violation, the report relies on the measured persisted state and source code for the underlying defect.

## High-priority reproduced defects

### F01. Student/class detail responses expose account-security fields

**Observed:** a teacher can request a student detail record and receive the linked parent's `user.password` hash, `tokenVersion`, `failedLogins` and `lastLoginIp`. Class detail returns the same fields for the class teacher. These are password **hashes**, not plaintext passwords, but they still must not be included in ordinary staff-facing responses.

**Reproduce:** authenticate as a teacher; GET `/api/students/:id` for a student with a guardian, or GET `/api/classes/:id`. Inspect field names only. Both returned HTTP 200 with the security fields present.

**Cause:** unrestricted nested `user: true` objects are returned directly. Student source: [students.routes.ts](../../server/src/routes/students.routes.ts), around lines 34-49. Class source: [classes.routes.ts](../../server/src/routes/classes.routes.ts), around lines 37-50.

**Fix direction:** explicit public-user projections/DTOs; add response-shape tests that reject security fields recursively. Evidence: `SECURITY-STUDENT` and `SECURITY-CLASS` in [runtime results](runtime-results.json).

### F02. School-wide Socket.IO updates disclose another child's private record

**Observed:** an audit parent received a `STUDENT_UPDATED` event for a student who was not their child, including the student's full before/after record and a synthetic private-address sentinel. The corresponding student HTTP endpoint is staff-only.

**Cause:** every authenticated role joins the school room, while `recordEvent` broadcasts full event payloads to that room. See [socket.ts](../../server/src/lib/socket.ts), lines 38-47, and [eventStore.ts](../../server/src/services/eventStore.ts), event broadcasting.

**Fix direction:** role/recipient-specific rooms and sanitized event payloads; never broadcast raw audit records to all school users. Evidence: `SOCKET-PRIVACY` in [additional results](additional-results.json).

### F03. Revoked/deactivated accounts can still authenticate to Socket.IO

**Observed:** after an audit teacher was deactivated and their token version incremented, HTTP `/api/auth/me` returned **401**, but a new Socket.IO connection using the same old JWT still connected.

**Cause:** socket authentication verifies the signature/expiry but does not check the live account, active state or token version. Existing sockets are also not proactively revoked. See [socket.ts](../../server/src/lib/socket.ts), lines 17-30; compare [HTTP authentication](../../server/src/middleware/auth.ts).

**Fix direction:** share live-account validation with sockets and disconnect/revalidate sessions when account state changes. Evidence: `SOCKET-REVOCATION` in [additional results](additional-results.json).

### F04. A parent can read another class's live attendance roster

**Observed:** GET `/api/presence/session/active` as a parent returned the latest active session for an unrelated class, including student names/IDs and verification states. The QR token was correctly hidden, but hiding that token does not protect the roster.

**Cause:** the route filters by school and optional caller-provided classId, then calls the full `sessionView` for any authenticated role. The stricter staff check on `GET /:id` does not apply here. See [session.routes.ts](../../server/src/routes/presence/session.routes.ts), lines 107-126.

**Fix direction:** resolve the student's/parent's permitted children/classes and return only their own minimal state. Evidence: `SESSION-ROSTER` in [runtime results](runtime-results.json).

### F05. Teacher class restrictions are missing on session manual marking

**Observed:** a teacher who did not lead the target class successfully posted `/api/presence/session/:id/manual` and changed its student's state to **PRESENT**.

**Cause:** the route allows every staff role, and `markManual` checks school/session/student membership without checking the actor's class ownership. Daily attendance and session creation do have ownership checks, so the controls are inconsistent. See [session.routes.ts](../../server/src/routes/presence/session.routes.ts), around line 225, and [engine.ts](../../server/src/services/presence/engine.ts), `markManual`.

**Fix direction:** apply the same teacher/class authorization to marking, closing and other session mutations, with explicit administrator exceptions. Evidence: `TEACHER-SCOPE` in [runtime results](runtime-results.json).

### F06. The expired-session simulator can modify another school's session

**Observed:** an administrator from audit school A submitted school B's active session ID to `/api/presence/simulate/expired`. The request returned 200 and school B's session changed from **ACTIVE to EXPIRED**.

**Cause:** the simulator updates by session ID without including schoolId before its later checks. See [simulate.routes.ts](../../server/src/routes/presence/simulate.routes.ts), the `/expired` handler.

**Fix direction:** scope the lookup/update before any mutation, and restrict simulator availability to intentional demo/test environments. Evidence: `SIMULATOR-CROSS-SCHOOL` in [simulator boundary results](simulator-boundaries.json).

### F07. Student deletion can delete attendance and then fail

**Observed:** deleting an audit student with both attendance and a fee returned **500**. The student still existed, but its attendance count had already become **zero**.

**Cause:** attendance and guardian links are deleted before the student, outside a transaction. Remaining fee/session relations can prevent the final deletion. See [students.routes.ts](../../server/src/routes/students.routes.ts), lines 113-115.

**Fix direction:** define withdrawal/deletion policy, prefer deactivation where records must survive, and perform any permitted deletion atomically with a meaningful conflict response. Evidence: `DELETE-PARTIAL` in [runtime results](runtime-results.json).

### F08. Undoing a session attendance mark loses an earlier LEAVE record

**Observed:** an audit student already had today's status **LEAVE**. Manual session marking changed it to present. Undoing the new attendance event removed the daily record entirely instead of restoring LEAVE.

**Cause:** session marking writes `previousStatus: null` into its undo payload even when the daily upsert overwrites an existing record. The reverser interprets null as “delete the newly created attendance row.” See [engine.ts](../../server/src/services/presence/engine.ts), around line 97, and [eventStore.ts](../../server/src/services/eventStore.ts), `ATTENDANCE_MARKED` reverser.

**Fix direction:** capture the actual prior daily record/source inside the transaction and restore it on undo. Evidence: `UNDO-ATTENDANCE` in [additional results](additional-results.json).

### F09. Database foreign keys do not consistently enforce school boundaries

**Observed:** a Class belonging to audit school A was accepted with a `classTeacherId` belonging to school B. The FK validates that the teacher exists, not that it belongs to the same school.

This was a **direct database integrity probe**, not evidence that an ordinary parent can create classes over HTTP. It demonstrates that the database-level isolation rule is incomplete for write-capable application paths.

**Cause:** school consistency triggers cover selected relations but not all tenant-bearing foreign keys. See [schema.prisma](../../server/prisma/schema.prisma), Class, and [advanced.sql](../../database/advanced.sql), `enforce_school_reference` trigger registrations.

**Fix direction:** tenant-scoped composite keys/FKs or complete equivalent constraints, plus negative tests for all cross-school relationships. Evidence: `DB-CROSS-SCHOOL` in [runtime results](runtime-results.json).

## Medium-priority reproduced defects

| ID | Failure and reproduction | Expected behavior / fix direction | Evidence and source |
| --- | --- | --- | --- |
| F10 | Fee amount **0.30**, payment **0.10**, then payment **0.20**: the second payment returns 400 “Amount exceeds outstanding balance.” | Decimal currency should settle exactly. Use fixed-precision decimal or integer minor units consistently in SQL and application arithmetic. | [Money results](money-face-results.json); Fee/Payment Float fields in [schema](../../server/prisma/schema.prisma), [fee guard](../../server/src/routes/fees.routes.ts), payment function in [advanced.sql](../../database/advanced.sql) |
| F11 | A PENDING fee due in 2000 is marked overdue in the unfiltered list, but disappears when selecting `status=OVERDUE`. | Filter by the same live overdue predicate used to label rows and compute summaries. | `FEE-FILTER`, [runtime results](runtime-results.json); [fees.routes.ts](../../server/src/routes/fees.routes.ts) |
| F12 | Creating another student with the same admissionNo in the same school returns **201**; two rows share that admission number. | Enforce appropriate school-scoped admission uniqueness and return a validation/conflict response. | `DUPLICATE-ADMISSION`, [additional results](additional-results.json); Student model and [student creation](../../server/src/routes/students.routes.ts) |
| F13 | A direct database insert accepts Student.rollNo **-5**, although the API rejects negative values. | Positive roll-number validation must also exist in the database, as required by requirement 12. | `DB-VALIDATION`, [runtime results](runtime-results.json); Student model / database constraints |
| F14 | `/api/attendance/mark` with the correct student/class accepts `date: "not-a-date"` and persists it. | Validate calendar dates at API and database levels; use a suitable date type where practical. | `DATE-VALIDATION`, [additional results](additional-results.json); [attendance.routes.ts](../../server/src/routes/attendance.routes.ts) |
| F15 | Editing a sourced knowledge entry using the existing UI's title/content/category payload changes its sourceId from a value to **null**. | Preserve provenance unless the user explicitly changes/removes it. | `KNOWLEDGE-PROVENANCE`, [workflow results](workflow-results.json); [knowledge.ts](../../server/src/services/knowledge.ts), line 39 |
| F16 | In a fresh one-student class, the simulator's **proxy** scenario returns **PRESENT**. Its claim/impostor indices both fall back to the same student. | Require enough distinct subjects, choose two different students, or reject the scenario clearly. Current indexing needs at least five students for that demonstration. | [Simulator boundaries](simulator-boundaries.json); `rosterStudent` and `/proxy` in [simulate.routes.ts](../../server/src/routes/presence/simulate.routes.ts) |
| F17 | With the server clock set to **Sunday, 18 October 2026 at 10:00 IST**, Digital Twin returns **Mon**, period 3, and **8 occupied rooms**. | Use configured school days, holidays, period times and break/closed states. The current fixed hour calculation also ignores custom start/period settings. | [Twin results](twin-results.json); [twin.routes.ts](../../server/src/routes/twin.routes.ts), lines 19-22 |

## Additional source/documentation gaps

**S01 - Digital Twin power is not measured.** Every room response contains `power: 'normal'`; the UI describes power among its live data. This is a static value, not sensor-backed power monitoring. Either implement a data source or label/remove the claim. Source: [twin.routes.ts](../../server/src/routes/twin.routes.ts), around line 72.

**S02 - ER diagram misses KnowledgeRevision.** The SQL audit table exists and has a short dictionary description, but it is not drawn as an entity in the generated Mermaid ER diagram. The complete physical/business schema diagram should include it, even though its itemId intentionally has no FK so deletion history survives. Source: [SCHEMA.md](../dbms/SCHEMA.md) and [diagram generator](../../scripts/generate-database-docs.py).

## Features unavailable or limited by configuration/design

| Feature | Current behavior | Classification |
| --- | --- | --- |
| AI notice drafting | `/api/notices/draft` returned **503** with OpenAI unconfigured. Manual notice sending returned **201** and the recipient received its in-app notification. | Not available in current configuration; manual sending works. Do not describe AI drafting as operational without a model/provider. |
| SMS and email | `sendSms`/`sendEmail` write “would send” entries to the Trust Ledger. No provider is configured. | Explicit stubs; no actual external delivery. |
| Remote mobile push / closed-app alerts | `sendPush` is a stub; Flutter has local notifications for events arriving while it is running, without an FCM registration/delivery path. | Background/closed-app remote push is not implemented. |
| Copilot without OpenAI | Tested questions return the implemented data-grounded fallback. | Fallback works; unrestricted model-backed answers were not tested/configured. |
| Time Machine | Activity replay and selected reversers exist; it does not reconstruct every database table at a past instant. F08 affects a supported undo path. | Limited implementation, not a complete database restore facility. |
| Long-document semantic search | One fixed-size sentence embedding is generated from title + content with truncation; no full-document chunking. | Long tails of documents may not participate in retrieval. This is already documented, not a newly reproduced search failure. |
| System Settings screen | Displays platform information and role matrix; it is not a general editable school-settings form. | Scope limitation; editable timetable/Presence settings exist elsewhere. |
| Student edit/delete in the web UI | Backend endpoints exist, but the inspected student screens mainly provide add/list/detail and enrollment. | Backend capability is not equivalent to a full edit/delete user workflow. |

Sources: [notification channels](../../server/src/services/presence/channels.ts), [Flutter push service](../../flutter_app/lib/core/notifications/push_service.dart), [notice drafting](../../server/src/services/notices/draft.ts), [trust routes](../../server/src/routes/trust.routes.ts), [Knowledge service](../../server/src/services/knowledge.ts), [Settings](../../client/src/views/Settings.tsx).

## Feature-by-feature assessment

“Pass” below means the stated checks passed. It does not mean every visual interaction or every input combination was exercised.

| Area | Verified behavior | Remaining failure / verification boundary |
| --- | --- | --- |
| Next.js startup/build and API integration | Production build; same-origin API rewrite; route/API inventory | Browser click-through, styling, hydration interactions and fresh screenshots unavailable |
| Login and personal session | Login, `/auth/me`, logout-all revocation, password rotation | Socket revocation differs from HTTP: F03 |
| Account administration | Reset password, mandatory-change gate, deactivate/reactivate, unlock, revoke sessions | Full visual administrator workflow not exercised |
| HTTP role guards | Negative teacher/parent/student probes and existing RBAC suites | F01, F04-F06 and realtime F02-F03 show incomplete authorization |
| Principal dashboard | Populated metrics and Python intelligence API | No visual layout verification |
| Teacher dashboard | Permitted API snapshot and existing timetable data | Browser/device interactions not exercised |
| Student/parent dashboard | Role-specific API and linked-student records | Related realtime/session privacy defects remain |
| Students | List/detail/search endpoint, valid create/update/simple delete, malformed-input rejection | F01, F07, F12-F14; complete edit/delete UI absent |
| Staff and absences | Staff list; substitute/cascade/undo suites | Arbitrary UI input combinations not exhaustively tested |
| Classes | List/detail; timetable-linked class data | F01 and F09 |
| Daily attendance | Roster, individual/bulk paths, role checks and trend API | F14; bulk route writes are not one all-or-nothing transaction |
| Presence sessions | Start/list/live/summary/close, expiry and QR/face state-machine tests | F04-F06, F08 |
| Presence exports | PDF and XLSX endpoints; export generation exercised | Export visual/page-layout QA not performed |
| Attendance analytics | All inventory analytics GET routes, histories and filters | Not every date/range/role combination tested |
| Face service | Loaded model, blank-frame no-face inference, synthetic matching tests | Actual camera enrollment, lighting, printed-photo/replay resistance and physical-device matching unverified |
| Attendance simulator | Start, no-face, unknown-face, correct-face, QR paths, proxy, camera-offline, close | F06 and F16; scenarios intentionally use synthetic embeddings |
| Lumen digital documents | Upload, asynchronous PDF extraction, review/readiness/commit tests | Not every document template/language/file corruption tested |
| Lumen scanned documents | Real Tesseract path; 7 fields extracted from synthetic scanned admission form | Field accuracy across real-world scans remains unverified |
| Lumen previews/originals | Both seeded documents returned 200 with matching encryption configuration | Key rotation/corrupted archives not tested |
| Lumen review/commit/rollback | Policy, field correction and commit suites; verified access guards | General rollback/data-retention failure cases are not fully covered |
| Lumen exports | CSV, JSON and XLSX responses succeeded | Manual spreadsheet/PDF visual QA unavailable |
| Kairos solver | Real seeded solution placed 189/189 periods; engine/validation/workflow suites | Browser drag/drop/lock-edit interactions not exercised |
| Kairos publish/history/rollback | Service tests and read APIs passed | Not every concurrent publication/lock-contention scenario tested |
| Substitute coverage/cascade | Existing cascade and workflow suites passed | Physical staffing outcomes and every edge constraint not verified |
| Fees and payments | Standard partial payment, overpayment rejection, view, audit event and transaction tests | F10-F11 |
| Foresight/intelligence | 181 tests and populated read APIs; PostgreSQL loader already migrated | Forecast predictive quality on real longitudinal data is not established by tests |
| Copilot | Suggested questions, configured data-grounded fallback, role denials | OpenAI-backed generation unconfigured |
| Notices | Audience resolution, draft failure handling, real in-app delivery, recipient feed/read state | AI draft 503; no SMS/email/remote-push delivery |
| Notifications | User-scoped feed and read/read-all behavior; Flutter notification tests | Closed-app remote delivery absent; browser/mobile end-to-end visuals unavailable |
| Emergency coordination | Trigger/acknowledge/resolve and operational locks covered by emergency suite | Real-world alert delivery/physical evacuation cannot be inferred from API tests |
| Digital Twin | Populated room response and controlled Sunday scenario | F17; S01 power value static |
| Trust ledger/activity replay/undo | Event listing, selected reversible actions, replay API | F02 exposes events; F08 corrupts a supported undo; no full historical state restore |
| Knowledge Library | Real embeddings, create/list/search/edit/delete, teacher denial, document import and revision trigger | F15; model truncation; visual interaction unavailable |
| Database Lab | All six query examples executed; indexes, extension, RLS metadata returned | No browser UI interaction/visual QA |
| SQL schema/advanced features | Migrations and DDL/DML script executed; 14 DB checks passed | F09/F12-F14; S02 diagram omission |
| Flutter companion | 36 tests, no analyzer issues, Android APK built | No Android/iOS device connected; camera/QR/permissions/background/resume/network transitions unverified |
| Deployment/operations | New GitHub repository, setup docs, prior native PostgreSQL CI success | Local session still uses a demo database runtime; production restore/load/failover tests not performed |

## Rubric assessment: all 14 rows

This is a coverage/quality assessment, **not a predicted mark or guarantee of 50/50**.

| # | Criterion | Marks | Audit assessment |
| --- | --- | ---: | --- |
| 1 | ER diagram | 2 | **Partial:** broad ER exists, but KnowledgeRevision is missing from the diagram (S02). |
| 2 | Relational schema, keys, relationships, constraints | 3 | **Partial:** implementation/dictionary exist; admission uniqueness and school-scoped relationship integrity are incomplete (F09/F12). |
| 3 | SQL DDL with constraints | 4 | **Implemented, incomplete integrity:** executable CREATE/ALTER/DROP and PK/FK/CHECK/indexes exist; F09/F12-F14 need correction. |
| 4 | Vector database creation | 4 | **Demonstrated:** PostgreSQL + native pgvector, vector(384), indexes and real embedding persistence. The requirements explicitly accept PostgreSQL with pgvector. |
| 5 | Technology justification | 1 | **Documented:** relational school transactions and semantic policy/document retrieval provide a defensible choice. |
| 6 | DML operations | 4 | **Present, quality issues:** CRUD is demonstrated, but deletion and decimal payments fail edge cases (F07/F10). |
| 7 | Nested/correlated/recursive queries and joins | 4 | **Demonstrated:** six Database Lab queries ran, including grouped joins, nested/correlated queries and recursive CTE. |
| 8 | Advanced SQL concepts | 6 | **Demonstrated with defects:** function, triggers, CTE, view, transactions and indexes exist; undo and broader transactional integrity require fixes. |
| 9 | Vector feature and RUD | 7 | **Substantially demonstrated:** real search and vector CRUD work; provenance is lost on editing (F15). |
| 10 | Next.js interface | 3 | **Framework/build verified:** actual Next.js frontend exists; complete visual/user-interaction verification was unavailable. |
| 11 | Backend/API and database integration | 2 | **Demonstrated, defects remain:** Express/Prisma/PostgreSQL and Python integration run; account-data exposure and inconsistent boundaries remain. |
| 12 | Authentication, two roles and database RBAC | 4 | **Not fully satisfied in quality:** six application roles and knowledge-table RLS exist, but F01-F06 show unauthorized access/mutation. Core operational tables continue relying on application guards and owner DB credentials. |
| 13 | Documentation and Git/GitHub | 2 | **Partial:** extensive docs and separate repository exist; fresh migrated-screen screenshots and ER completion remain. Individual contributor evidence is pending. |
| 14 | Originality, individual contribution, modification/viva | 4 | **Pending team/instructor evidence:** two-member names/assignments/contributions remain blank; original project reuse is attributed but instructor acceptance, section-title uniqueness and each member's viva performance cannot be verified from code. |
| | Total available | **50** | **Do not claim full compliance at this stage.** |

## Other requirements from the supplied PDF

- **Meaningful problem / beyond CRUD:** met by school operations, timetable generation, verified attendance, forecasting and semantic retrieval.
- **Two approved team members, each contributing to DB and app:** not completed in repository evidence; [CONTRIBUTIONS.md](../dbms/CONTRIBUTIONS.md) remains a template, as previously requested.
- **Minimum four advanced SQL concepts plus a vector concept:** present and executable.
- **Database-level input validation:** only partially complete; API validation alone does not satisfy the stated requirement for the failed cases.
- **Environment-based configuration:** implemented. Demo/sample credentials are documented and ignored local env files exist. Deployment secrets must be supplied appropriately.
- **Soft-copy report:** objectives, requirements, schema, database justification, queries, architecture, tests and conclusion exist; ER completeness and fresh UI screenshots need work.
- **Originality:** the repository identifies the author's existing Meridian base. The team must establish instructor acceptance for reuse and show actual individual work; an audit cannot supply those facts.
- **Demonstration readiness:** the technical demo can show many working features, but the high-priority defects should be fixed before claiming secure/correct execution. Use the native PostgreSQL + pgvector deployment for course evaluation, rather than presenting the local demo runtime as a fully verified production installation.

## Environment and test limitations

- Android debug build succeeded despite Flutter Doctor warning that the Android SDK path contains spaces. Windows desktop tooling is incomplete. Neither warning is being reported as an Android build failure.
- Only Windows/Chrome/Edge targets were listed; no physical Android/iOS device was connected.
- Browser automation had no connected browser, and the native pipe was unavailable. Opening a page in a browser earlier is not evidence that every control was clicked or rendered correctly.
- The dependency audit reports **four moderate findings, zero high and zero critical**, in legacy React Router / ExcelJS-uuid chains. See [production dependency audit](production-dependency-audit.json). Major upgrades were not applied during this report-only audit.
- Initial document 404s were caused by the audit reader using a different JWT-derived encryption key than the seeder. Matching the configuration restored all four preview/original requests to HTTP 200. These are **excluded from product defects**.
- A notice send response of 201 was initially compared against an incorrect audit expectation of 200. The expectation was corrected; sending works.
- No actual face photograph, account credential, token or encryption-key value is included in the evidence files.

## Recommended repair order

1. Stop security-field leakage; restrict realtime payloads/rooms; implement socket revocation checks.
2. Fix session/teacher/parent scope checks and the simulator's cross-school mutation.
3. Make student deletion atomic or use a proper withdrawal flow; correct attendance undo.
4. Add tenant-consistent FKs, admission uniqueness and database/API date/roll constraints.
5. Correct decimal fee arithmetic, overdue filtering, knowledge provenance and simulator small-class handling.
6. Drive Digital Twin from the real school calendar/timetable; label static power accurately.
7. Complete the ER diagram, fresh screenshots and actual team contribution/viva evidence; configure only the external delivery/AI services the demonstration intends to claim.

## Evidence files

- [Audit summary](summary.json)
- [Complete route inventory](route-inventory.json)
- [Read sweep and targeted CRUD/authorization results](runtime-results.json)
- [Additional integrity and realtime results](additional-results.json)
- [Knowledge/notices/account/PDF workflow results](workflow-results.json)
- [Decimal payment and real no-face inference](money-face-results.json)
- [Scanned OCR and simulator results](scan-simulator-results.json)
- [Simulator tenant/small-class boundaries](simulator-boundaries.json)
- [Controlled Digital Twin Sunday result](twin-results.json)
- [Dependency audit](production-dependency-audit.json)

Local working evidence and harnesses remain under ignored `tmp/full-audit/`. They operate on audit fixtures, not the running school database. Existing application source files remain unchanged by this audit.
