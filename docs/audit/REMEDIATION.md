# Audit repair and verification record

Repair verification: **17 October 2026**. The [original audit](COMPLETE_AUDIT.md) remains historical evidence; its failure descriptions refer to the pre-repair implementation.

## Findings addressed

| Finding | Implemented correction | Verification |
| --- | --- | --- |
| F01 security fields in nested responses | Explicit public-user selections in student/class responses | Recursive response-shape assertions |
| F02 private realtime data broadcast | School events carry cache invalidations; private audit/AI/document details are restricted; attendance details are removed for other roles | Real parent socket receives `{}` rather than another child's record |
| F03 revoked socket sessions | Shared HTTP/socket live-account validation, immediate route-triggered disconnect, delivery-time validation and periodic expiry/revocation checks | Revoked/inactive/wrong-school/mandatory-change connections rejected; active session disconnected on revocation |
| F04 unrelated parent session rosters | Sessions restricted to linked children/classes; personal grids and counts include only linked students | Unrelated active session hidden; peer excluded from own-class response |
| F05 teacher class scope | Service-level actor checks for manual/face/QR/close; read/export/list routes scoped consistently | Wrong-class marking, close, detail, summary and exports denied; owning teacher succeeds |
| F06 cross-school simulator expiry | Every scenario scopes its session before any action; production simulator disabled unless explicitly enabled | All eight foreign-school scenarios rejected without changing expiry/status |
| F07 partial student deletion | Transactional deletion; historical records cause 409 with withdrawal guidance; web edit/withdraw/reactivate/delete controls added | Attendance/guardian links preserved on conflict; browser workflow persisted |
| F08 attendance undo loses LEAVE | Actual prior status/source/confidence/marker captured inside transaction and restored; verification evidence reset | LEAVE and prior evidence restored after a session mark |
| F09 incomplete tenant references | Database trigger checks actual FK graph, derived ownership, snapshot associations and biometric subjects; tenant ownership cannot be reassigned; existing links checked at installation | Direct SQL rejects foreign teachers, rooms, logins, guardians, sessions, students and timetable assignments |
| F10 floating-point payments | Fee/Payment `numeric(12,2)` with Prisma Decimal; exact locked SQL operation and decimal guard; numeric HTTP compatibility preserved | 0.30 settled exactly by 0.10 + 0.20; excess precision/overpayment rejected |
| F11 overdue filter | List uses the same live overdue predicate as badges/summary | Past-due PENDING fee included in OVERDUE |
| F12 duplicate admissions | School/admission unique index plus friendly application conflict checks | API duplicate 409; direct SQL duplicate rejected |
| F13 negative rolls | Database CHECK for positive roll and nonblank admission | Direct SQL negative roll rejected |
| F14 invalid calendar dates | Actual calendar validation in attendance APIs and DB checks on operational date columns | Invalid strings, impossible February dates and year zero rejected |
| F15 knowledge provenance lost | Omitted source preserved; explicit null supported separately | Re-embedding preserves source/revision; explicit removal tested |
| F16 one-student proxy simulation | Requires two distinct students | One-student scenario returns clear 400 without attendance |
| F17 incorrect Digital Twin calendar | Configured school timezone, working days, holidays, period start/duration, breaks and blocked cells | Sunday/weekend/custom-time/break/holiday/boundary assertions |
| S01 fabricated live power | API labels power unmonitored; UI says Not monitored and describes scheduled occupancy/recorded attendance | Source and browser view checked |
| S02 missing KnowledgeRevision ER entity | Schema generator includes audit entity alongside physical models and vector collection | Regenerated ER/dictionary includes 41 Prisma models plus KnowledgeItem and KnowledgeRevision |

## Additional corrections during verification

- Shared face enrollment UI now sends captured images plus explicit consent to the real InsightFace API. The obsolete 128-dimensional browser-vector payload was removed. Images remain transient; matching templates are 512-dimensional.
- Webcam cancellation stops captures that finish after component cleanup; enrollment supports retaking frames.
- Realtime uses polling first through Next.js and replaces its connection when the authentication token rotates. Flutter reconnects/re-registers after changing a password.
- Twilio, SendGrid and Firebase adapters, device registration, session-aware push filtering, invalid-token pruning and configuration status are implemented. See [activation instructions](../NOTIFICATIONS.md).
- Web/Flutter manual notice drafting works without an OpenAI key; AI-only controls report missing configuration honestly.
- Document retention preserves unknown folders by default. Explicit orphan cleanup requires opt-in and an age threshold. A failed database deletion no longer falls through to deleting its files.
- React Router updated to 7.18.4 to address the router advisories. Other dependency findings are recorded separately; a forced Tailwind major migration was not applied without layout validation.

## Verification and evidence

**364 automated tests passed: 147 server, 181 Python intelligence, 36 Flutter.** Database verification passed 29 assertions; the browser passed 40 checks; 16 live health/query checks passed. Production build, Flutter analysis and Android APK passed. Final counts, browser results and current dependency status are captured in [repair-results.json](repair-results.json). Browser checks exercise real login, 26 principal routes, student mutation workflows, semantic CRUD, Database Lab, payments, role denial and parent/student mobile layouts. They do not replace physical camera/QR/background-push tests. [Fresh screenshots](screenshots/) use seeded synthetic school data only.

Native PostgreSQL/pgvector CI is linked in the final verification evidence after its run. Local SQL checks use isolated PostgreSQL/PGlite with the real pgvector extension; they do not establish production load/failover safety.

## Limits and remaining activation/evaluation work

1. **Credentials and devices:** Twilio/SendGrid/Firebase delivery needs your actual provider configuration. No external delivery was attempted. OpenAI generation is unconfigured; manual notices and data-grounded Copilot remain usable. Camera matching, replay resistance, physical QR, iOS provisioning and closed-app push must be checked on intended devices.
2. **Old local demo data:** the prior PGlite store on port 55432 failed to reopen with an invalid checkpoint/WAL record. It was preserved at `tmp/postgres-test/data`, with a copy at `tmp/postgres-test/backup-before-audit-repairs-20261017`. It was not reset or reseeded. The working demo uses a **separate freshly seeded database on 55435** and isolated document storage. This is not a claim that the old store was recovered.
3. **Storage incident:** before the storage isolation fix, the existing startup retention sweep removed two folders absent from the newly attached demo database. Their contents have not been recovered. The new demo's own document assets are isolated at `tmp/repaired-demo/documents`. The old database backup does not itself restore those removed files. Review backup/restore requirements before reusing shared storage with another database.
4. **Team/instructor evidence:** individual names, real contributions, section-title approval, original-project reuse approval and viva performance remain team/instructor facts. The contributions template is intentionally not fabricated.
5. **Scope:** Time Machine supports selected reversers/activity replay, not full database snapshots. Semantic search embeds focused excerpts with model truncation rather than arbitrary long-document chunking. System Settings reports platform/access/provider configuration; editable academic and Presence settings remain in their own workflows.
6. **Dependencies/build warnings:** current dependency evidence identifies remaining ExcelJS/UUID and build-tool advisories. React 18 deprecation and face-api dynamic-require build warnings remain nonfatal. Flutter tests pass with existing nonfatal hit-test warnings. These are not represented as zero warnings or zero vulnerabilities.

The 17 reproduced audit defects are repaired with regression coverage. These checks establish the tested behavior; they do not justify a guarantee of perfect operation or a guaranteed 50/50 evaluation.
