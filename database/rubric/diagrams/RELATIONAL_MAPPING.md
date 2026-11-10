# Chen ER to relational-schema mapping

This document maps the requested Chen diagram to the actual PostgreSQL website schema: **43 relations, 441 attributes and 67 declared foreign keys**. The catalogue was read from `meridian:5432` at **2026-11-10T08:47:28.892Z**. PostgreSQL 16.15, pgvector 0.8.7.

[Chen ER image](chen/01_complete_chen_er.svg) | [Horizontal relational mapping image](relational/01_complete_relational_mapping.svg) | [Image guide](README.md) | [Verification](VERIFICATION.md)

## How to read and map the diagrams

1. **Entity to relation.** Every blue entity rectangle maps to the relation with the same exact case-sensitive name. Each underlined `id` maps to the actual primary key. Non-FK ovals become columns. In Chen, declared FK fields are represented by relationship diamonds; in the relational image they reappear as coloured FK columns. There are **374 non-FK attribute ovals + 67 FK columns = 441 mapped attributes**.
2. **One-to-many relationship.** Put the referenced key on the many side as a foreign key. Example: `Class.id -> Student.classId`. `Student.classId` is nullable, so a student can have zero or one class; a class can have zero or many students. The Chen ratio is 1:N, with partial participation at Student.
3. **One-to-one relationship.** A unique FK limits the child to at most one row per parent. `Teacher.userId` and `Parent.userId` are NOT NULL and UNIQUE: each profile must have one User, while each User may have zero or one profile of that kind. `Student.userId` is nullable and UNIQUE, so both sides are optional. `AcademicConfig.schoolId` is also UNIQUE and NOT NULL. The User role itself is a stored attribute and CHECK constraint, not a separate role entity.
4. **Many-to-many relationship.** `Student` and `Parent` are linked through the associative entity `StudentParent(id, studentId, parentId)`. Its **PK is id**, and **UQ(studentId, parentId)** prevents duplicate pairs. Both FKs are NOT NULL. The pair is not incorrectly labelled as the primary key. `ClassSubjectPlan` similarly connects Class and Subject, with UQ(classId, subjectId) and the attributes weeklyPeriods, requiresLab and elective.
5. **Relationship attributes and session identity.** `AttendanceVerification` stores the attributes of one student/session pairing: state, QR/face timestamps, confidence and completion time. Its PK is id; UQ(sessionId, studentId) allows one verification per student in a session. The database Present CHECK requires both proofs on new or updated rows, while existing historical rows were deliberately not retroactively validated.
6. **Scheduling uniqueness.** `TimetableSlot` relates a timetable, class, subject, teacher and optional room to a day/period. Independent UNIQUE indexes protect timetable/class/day/period, timetable/teacher/day/period, and timetable/room/day/period. The room is nullable, and ordinary PostgreSQL UNIQUE semantics allow multiple NULL room values. `Timetable` also has a partial unique index on schoolId for active published versions only.

## Notation and participation

- Rectangle: entity; diamond: relationship; ellipse: attribute; underlining: primary key. Red 1 and N labels express maximum cardinality ratios. A double line at the child denotes total participation caused by a NOT NULL FK; a single line denotes partial participation. No parent is shown as required to have at least one child merely because an FK exists.
- Associative entities are shown as rectangles because they have actual independent id keys. This is a faithful reverse-engineered Chen representation of the implemented database. The two 1:N relationships through an associative entity implement M:N between the endpoint entities.
- No weak-entity double rectangle, identifying double diamond, multivalued double oval or derived dashed oval is added without a corresponding design basis. All implemented tables have an independent id PK. Text containing JSON is still a text attribute in this physical schema.
- In relational images, an arrow starts at the FK attribute and points to the referenced key. Colour groups arrows by their target relation. UQ applies to the whole combination. A nullable UNIQUE value is not required to exist.
- Grey boxes/rows in module images are external parent references, showing only the PK. They are fully defined in their own module. Each real FK is owned by the module containing its child table, so the seven modules cover all 67 FKs exactly once.

## Logical references and deliberate exceptions

The diagrams show **declared PostgreSQL FKs**, not an inferred FK for every column ending in Id. For example, `NotificationRead.userId`, `Attendance.markedById`, `AttendanceEvent.verificationId`, and `Substitution.classId` are ordinary attributes in the installed schema. They are not silently upgraded to SQL constraints in these drawings. The backend and selected tenant triggers handle logical associations; consult the implementation for each case.

`KnowledgeRevision.itemId`, schoolId and actorId are audit snapshot identifiers without declared FKs; history can remain after item deletion. `FaceEvent.schoolId` is also not a declared FK. `FaceEnrollment.subjectId` and `FaceEmbedding.subjectId` are polymorphic identifiers qualified by subjectType; the tenant trigger validates supported biometric subjects. `KnowledgeItem.embedding` is native vector(384). `FaceEmbedding.vectorString` is text containing face-engine vectors; it is not mislabelled as a native pgvector column.

`_prisma_migrations` is internal migration bookkeeping and is excluded from the 43 application relations. It remains in the database. Views, triggers, policies and indexes are database objects rather than separate entity rectangles. Nothing in this export changes database data or schema.

## Complete relationship mapping

| Child FK | Referenced key | Child may have NULL FK | Parents per child | Children per parent | Delete action |
| --- | --- | --- | --- | --- | --- |
| AttendanceEvent.sessionId | AttendanceSession.id | YES | 0..1 | 0..many | SET NULL |
| AttendanceVerification.sessionId | AttendanceSession.id | NO | 1 | 0..many | CASCADE |
| Room.buildingId | Building.id | NO | 1 | 0..many | RESTRICT |
| Attendance.classId | Class.id | NO | 1 | 0..many | RESTRICT |
| AttendanceSession.classId | Class.id | NO | 1 | 0..many | RESTRICT |
| ClassSubjectPlan.classId | Class.id | NO | 1 | 0..many | CASCADE |
| Student.classId | Class.id | YES | 0..1 | 0..many | SET NULL |
| TimetableSlot.classId | Class.id | NO | 1 | 0..many | RESTRICT |
| DocumentActivity.documentId | Document.id | NO | 1 | 0..many | CASCADE |
| DocumentInsight.documentId | Document.id | NO | 1 | 0..many | CASCADE |
| DocumentPage.documentId | Document.id | NO | 1 | 0..many | CASCADE |
| ExtractedField.documentId | Document.id | NO | 1 | 0..many | CASCADE |
| EmergencyAck.incidentId | EmergencyIncident.id | NO | 1 | 0..many | CASCADE |
| EmergencyEvent.incidentId | EmergencyIncident.id | NO | 1 | 0..many | CASCADE |
| FaceEmbedding.enrollmentId | FaceEnrollment.id | YES | 0..1 | 0..many | CASCADE |
| Payment.feeId | Fee.id | NO | 1 | 0..many | RESTRICT |
| NotificationRead.notificationId | Notification.id | NO | 1 | 0..many | CASCADE |
| StudentParent.parentId | Parent.id | NO | 1 | 0..many | RESTRICT |
| Class.roomId | Room.id | YES | 0..1 | 0..many | SET NULL |
| TimetableSlot.roomId | Room.id | YES | 0..1 | 0..many | SET NULL |
| AILog.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| AcademicConfig.schoolId | School.id | NO | 1 | 0..1 | RESTRICT |
| Attendance.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| AttendanceEvent.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| AttendanceSession.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| AuditLog.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Building.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Class.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Document.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| EmergencyIncident.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Event.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| FaceEnrollment.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Fee.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| KnowledgeItem.schoolId | School.id | NO | 1 | 0..many | CASCADE |
| Notification.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Parent.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Prediction.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| PushDevice.schoolId | School.id | NO | 1 | 0..many | NO ACTION |
| Setting.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Student.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Subject.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Teacher.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Timetable.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| User.schoolId | School.id | NO | 1 | 0..many | RESTRICT |
| Substitution.absenceId | StaffAbsence.id | NO | 1 | 0..many | RESTRICT |
| Attendance.studentId | Student.id | NO | 1 | 0..many | RESTRICT |
| AttendanceEvent.studentId | Student.id | YES | 0..1 | 0..many | SET NULL |
| AttendanceVerification.studentId | Student.id | NO | 1 | 0..many | RESTRICT |
| Fee.studentId | Student.id | NO | 1 | 0..many | RESTRICT |
| StudentParent.studentId | Student.id | NO | 1 | 0..many | RESTRICT |
| AttendanceSession.subjectId | Subject.id | YES | 0..1 | 0..many | SET NULL |
| ClassSubjectPlan.subjectId | Subject.id | NO | 1 | 0..many | CASCADE |
| TimetableSlot.subjectId | Subject.id | NO | 1 | 0..many | RESTRICT |
| AttendanceSession.teacherId | Teacher.id | NO | 1 | 0..many | RESTRICT |
| Class.classTeacherId | Teacher.id | YES | 0..1 | 0..many | SET NULL |
| StaffAbsence.teacherId | Teacher.id | NO | 1 | 0..many | RESTRICT |
| Substitution.subTeacherId | Teacher.id | NO | 1 | 0..many | RESTRICT |
| TimetableSlot.teacherId | Teacher.id | NO | 1 | 0..many | RESTRICT |
| TimetableSlot.timetableId | Timetable.id | NO | 1 | 0..many | CASCADE |
| AILog.actorId | User.id | YES | 0..1 | 0..many | SET NULL |
| AuditLog.actorId | User.id | YES | 0..1 | 0..many | SET NULL |
| KnowledgeItem.createdBy | User.id | NO | 1 | 0..many | NO ACTION |
| Notification.userId | User.id | YES | 0..1 | 0..many | SET NULL |
| Parent.userId | User.id | NO | 1 | 0..1 | RESTRICT |
| PushDevice.userId | User.id | NO | 1 | 0..many | CASCADE |
| Student.userId | User.id | YES | 0..1 | 0..1 | SET NULL |
| Teacher.userId | User.id | NO | 1 | 0..1 | RESTRICT |

## Complete relation definitions

Types, nullability, keys and checks below come directly from the same live snapshot. Exact SQL spelling is preserved; quoted CamelCase names must be quoted in SQL. Defaults are schema expressions, not extracted personal data.

### AILog

```text
AILog(id, schoolId, engine, action, reason, confidence, inputString, outputString, actorId, reversible, createdAt)
PK (id)
FK (schoolId) -> School(id)
FK (actorId) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| engine | text | NO | - | - |
| action | text | NO | - | - |
| reason | text | YES | - | - |
| confidence | double precision | YES | - | - |
| inputString | text | YES | - | - |
| outputString | text | YES | - | - |
| actorId | text | YES | FK | - |
| reversible | boolean | NO | - | true |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### AcademicConfig

```text
AcademicConfig(id, schoolId, academicYear, termsString, workingDays, dayStart, periodMinutes, periodsPerDay, breaksString, blockedString, holidaysString, examWeeksString, updatedAt)
PK (id)
UQ (schoolId)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK, UQ | - |
| academicYear | text | NO | - | '2026-27'::text |
| termsString | text | YES | - | - |
| workingDays | integer | NO | - | 5 |
| dayStart | text | NO | - | '08:00'::text |
| periodMinutes | integer | NO | - | 45 |
| periodsPerDay | integer | NO | - | 8 |
| breaksString | text | YES | - | - |
| blockedString | text | YES | - | - |
| holidaysString | text | YES | - | - |
| examWeeksString | text | YES | - | - |
| updatedAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### Attendance

```text
Attendance(id, schoolId, studentId, classId, date, status, source, confidence, markedById, timestamp)
PK (id)
UQ (studentId, date)
FK (classId) -> Class(id)
FK (schoolId) -> School(id)
FK (studentId) -> Student(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| studentId | text | NO | FK | - |
| classId | text | NO | FK | - |
| date | text | NO | - | - |
| status | text | NO | - | 'PRESENT'::text |
| source | text | NO | - | 'MANUAL'::text |
| confidence | double precision | YES | - | - |
| markedById | text | YES | - | - |
| timestamp | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

CHECK constraints:

- `Attendance_date_calendar`: `CHECK (valid_calendar_date(date))`
- `attendance_status_check`: `CHECK ((status = ANY (ARRAY['PRESENT'::text, 'ABSENT'::text, 'LATE'::text, 'LEAVE'::text])))`

### AttendanceEvent

```text
AttendanceEvent(id, schoolId, studentId, sessionId, verificationId, source, timestamp, direction, verificationStatus, faceConfidence, faceDistance, late, lateMinutes, createdBy, notes)
PK (id)
FK (sessionId) -> AttendanceSession(id)
FK (schoolId) -> School(id)
FK (studentId) -> Student(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| studentId | text | YES | FK | - |
| sessionId | text | YES | FK | - |
| verificationId | text | YES | - | - |
| source | text | NO | - | - |
| timestamp | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| direction | text | NO | - | 'ENTRY'::text |
| verificationStatus | text | NO | - | 'VERIFIED'::text |
| faceConfidence | double precision | YES | - | - |
| faceDistance | double precision | YES | - | - |
| late | boolean | NO | - | false |
| lateMinutes | integer | YES | - | - |
| createdBy | text | YES | - | - |
| notes | text | YES | - | - |

### AttendanceSession

```text
AttendanceSession(id, schoolId, classId, teacherId, subjectId, date, status, startTime, expiryTime, closedAt, sessionToken, createdBy, verificationMode)
PK (id)
UQ (sessionToken)
FK (classId) -> Class(id)
FK (schoolId) -> School(id)
FK (subjectId) -> Subject(id)
FK (teacherId) -> Teacher(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| classId | text | NO | FK | - |
| teacherId | text | NO | FK | - |
| subjectId | text | YES | FK | - |
| date | text | NO | - | - |
| status | text | NO | - | 'ACTIVE'::text |
| startTime | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| expiryTime | timestamp(3) without time zone | NO | - | - |
| closedAt | timestamp(3) without time zone | YES | - | - |
| sessionToken | text | NO | UQ | - |
| createdBy | text | YES | - | - |
| verificationMode | text | NO | - | 'QR_FACE'::text |

CHECK constraints:

- `AttendanceSession_active_requires_dual`: `CHECK (((status <> 'ACTIVE'::text) OR ("verificationMode" = 'QR_FACE'::text)))`
- `AttendanceSession_date_calendar`: `CHECK (valid_calendar_date(date))`
- `AttendanceSession_verificationMode_check`: `CHECK (("verificationMode" = ANY (ARRAY['QR_FACE'::text, 'QR_ONLY'::text, 'FACE_REQUIRED'::text])))`

### AttendanceVerification

```text
AttendanceVerification(id, sessionId, studentId, state, qrVerifiedAt, faceVerifiedAt, faceConfidence, faceDistance, threshold, markedPresentAt, proxyClaimedStudentId, proxyMatchedName, reason, updatedAt, createdAt)
PK (id)
UQ (sessionId, studentId)
FK (sessionId) -> AttendanceSession(id)
FK (studentId) -> Student(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| sessionId | text | NO | FK | - |
| studentId | text | NO | FK | - |
| state | text | NO | - | 'PENDING'::text |
| qrVerifiedAt | timestamp(3) without time zone | YES | - | - |
| faceVerifiedAt | timestamp(3) without time zone | YES | - | - |
| faceConfidence | double precision | YES | - | - |
| faceDistance | double precision | YES | - | - |
| threshold | double precision | YES | - | - |
| markedPresentAt | timestamp(3) without time zone | YES | - | - |
| proxyClaimedStudentId | text | YES | - | - |
| proxyMatchedName | text | YES | - | - |
| reason | text | YES | - | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

CHECK constraints:

- `AttendanceVerification_present_requires_both`: `CHECK (((state <> 'PRESENT'::text) OR (("qrVerifiedAt" IS NOT NULL) AND ("faceVerifiedAt" IS NOT NULL) AND ("markedPresentAt" IS NOT NULL) AND ("qrVerifiedAt" <= "markedPresentAt") AND ("faceVerifiedAt" <= "markedPresentAt") AND ("faceConfidence" IS NOT NULL) AND (threshold IS NOT NULL) AND (threshold > (0)::double precision) AND (threshold <= (1)::double precision) AND ("faceConfidence" >= threshold) AND ("faceConfidence" <= (1)::double precision)))) NOT VALID` (NOT VALID for historical rows; enforced on new/updated rows)

### AuditLog

```text
AuditLog(id, schoolId, actorId, action, entity, entityId, metaString, createdAt)
PK (id)
FK (schoolId) -> School(id)
FK (actorId) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| actorId | text | YES | FK | - |
| action | text | NO | - | - |
| entity | text | NO | - | - |
| entityId | text | YES | - | - |
| metaString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### Building

```text
Building(id, schoolId, name, floors, x, y)
PK (id)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| name | text | NO | - | - |
| floors | integer | NO | - | 2 |
| x | double precision | NO | - | 0 |
| y | double precision | NO | - | 0 |

### Class

```text
Class(id, schoolId, grade, section, name, roomId, classTeacherId, createdAt)
PK (id)
UQ (schoolId, grade, section)
FK (roomId) -> Room(id)
FK (schoolId) -> School(id)
FK (classTeacherId) -> Teacher(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| grade | integer | NO | - | - |
| section | text | NO | - | - |
| name | text | NO | - | - |
| roomId | text | YES | FK | - |
| classTeacherId | text | YES | FK | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### ClassSubjectPlan

```text
ClassSubjectPlan(id, classId, subjectId, weeklyPeriods, requiresLab, elective)
PK (id)
UQ (classId, subjectId)
FK (classId) -> Class(id)
FK (subjectId) -> Subject(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| classId | text | NO | FK | - |
| subjectId | text | NO | FK | - |
| weeklyPeriods | integer | NO | - | 4 |
| requiresLab | boolean | NO | - | false |
| elective | boolean | NO | - | false |

### Document

```text
Document(id, schoolId, type, typeConfidence, fileName, mimeType, sizeBytes, pageCount, status, overallConfidence, processingMs, pipelineString, rawText, errorMessage, batchId, correctionCount, committedAt, committedKind, committedRefId, uploadedById, createdAt, updatedAt)
PK (id)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| type | text | NO | - | - |
| typeConfidence | double precision | NO | - | 0 |
| fileName | text | NO | - | - |
| mimeType | text | NO | - | 'application/pdf'::text |
| sizeBytes | integer | NO | - | 0 |
| pageCount | integer | NO | - | 1 |
| status | text | NO | - | 'QUEUED'::text |
| overallConfidence | double precision | NO | - | 0 |
| processingMs | integer | NO | - | 0 |
| pipelineString | text | YES | - | - |
| rawText | text | YES | - | - |
| errorMessage | text | YES | - | - |
| batchId | text | YES | - | - |
| correctionCount | integer | NO | - | 0 |
| committedAt | timestamp(3) without time zone | YES | - | - |
| committedKind | text | YES | - | - |
| committedRefId | text | YES | - | - |
| uploadedById | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | - |

### DocumentActivity

```text
DocumentActivity(id, documentId, kind, actorId, actorName, detailString, createdAt)
PK (id)
FK (documentId) -> Document(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| documentId | text | NO | FK | - |
| kind | text | NO | - | - |
| actorId | text | YES | - | - |
| actorName | text | YES | - | - |
| detailString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### DocumentInsight

```text
DocumentInsight(id, documentId, kind, severity, message, detailString, createdAt)
PK (id)
FK (documentId) -> Document(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| documentId | text | NO | FK | - |
| kind | text | NO | - | - |
| severity | text | NO | - | 'WARNING'::text |
| message | text | NO | - | - |
| detailString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### DocumentPage

```text
DocumentPage(id, documentId, index, width, height, source, rotation, skewDeg, ocrConfidence, quality, wordsString)
PK (id)
UQ (documentId, index)
FK (documentId) -> Document(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| documentId | text | NO | FK | - |
| index | integer | NO | - | - |
| width | integer | NO | - | - |
| height | integer | NO | - | - |
| source | text | NO | - | - |
| rotation | integer | NO | - | 0 |
| skewDeg | double precision | NO | - | 0 |
| ocrConfidence | double precision | NO | - | 0 |
| quality | text | YES | - | - |
| wordsString | text | YES | - | - |

### EmergencyAck

```text
EmergencyAck(id, incidentId, userId, userName, role, classId, className, status, note, createdAt, updatedAt)
PK (id)
UQ (incidentId, userId)
FK (incidentId) -> EmergencyIncident(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| incidentId | text | NO | FK | - |
| userId | text | NO | - | - |
| userName | text | NO | - | - |
| role | text | NO | - | - |
| classId | text | YES | - | - |
| className | text | YES | - | - |
| status | text | NO | - | - |
| note | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | - |

### EmergencyEvent

```text
EmergencyEvent(id, incidentId, type, message, actorName, createdAt)
PK (id)
FK (incidentId) -> EmergencyIncident(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| incidentId | text | NO | FK | - |
| type | text | NO | - | - |
| message | text | NO | - | - |
| actorName | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### EmergencyIncident

```text
EmergencyIncident(id, schoolId, kind, severity, status, triggeredBy, triggeredById, note, createdAt, resolvedAt, resolvedBy, resolvedById)
PK (id)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| kind | text | NO | - | - |
| severity | text | NO | - | 'CRITICAL'::text |
| status | text | NO | - | 'ACTIVE'::text |
| triggeredBy | text | YES | - | - |
| triggeredById | text | YES | - | - |
| note | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| resolvedAt | timestamp(3) without time zone | YES | - | - |
| resolvedBy | text | YES | - | - |
| resolvedById | text | YES | - | - |

### Event

```text
Event(id, schoolId, type, aggregate, aggregateId, payloadString, actorId, actorName, reversible, reverted, createdAt)
PK (id)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| type | text | NO | - | - |
| aggregate | text | NO | - | - |
| aggregateId | text | NO | - | - |
| payloadString | text | NO | - | - |
| actorId | text | YES | - | - |
| actorName | text | YES | - | - |
| reversible | boolean | NO | - | true |
| reverted | boolean | NO | - | false |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### ExtractedField

```text
ExtractedField(id, documentId, key, label, value, rawValue, confidence, ocrConfidence, page, cropX, cropY, cropW, cropH, status, source, valid, validationMessage, corrected, required)
PK (id)
FK (documentId) -> Document(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| documentId | text | NO | FK | - |
| key | text | NO | - | - |
| label | text | NO | - | - |
| value | text | NO | - | - |
| rawValue | text | YES | - | - |
| confidence | double precision | NO | - | - |
| ocrConfidence | double precision | NO | - | 0 |
| page | integer | NO | - | 0 |
| cropX | double precision | NO | - | - |
| cropY | double precision | NO | - | - |
| cropW | double precision | NO | - | - |
| cropH | double precision | NO | - | - |
| status | text | NO | - | 'AUTO'::text |
| source | text | NO | - | 'OCR'::text |
| valid | boolean | NO | - | true |
| validationMessage | text | YES | - | - |
| corrected | boolean | NO | - | false |
| required | boolean | NO | - | false |

### FaceEmbedding

```text
FaceEmbedding(id, schoolId, enrollmentId, subjectType, subjectId, name, vectorString, model, dim, label, quality, createdAt)
PK (id)
FK (enrollmentId) -> FaceEnrollment(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | - | - |
| enrollmentId | text | YES | FK | - |
| subjectType | text | NO | - | - |
| subjectId | text | NO | - | - |
| name | text | NO | - | - |
| vectorString | text | NO | - | - |
| model | text | NO | - | 'insightface-buffalo_l'::text |
| dim | integer | NO | - | 512 |
| label | text | NO | - | 'front'::text |
| quality | double precision | NO | - | 0 |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### FaceEnrollment

```text
FaceEnrollment(id, schoolId, subjectType, subjectId, name, model, consentAt, consentBy, createdAt, updatedAt)
PK (id)
UQ (subjectType, subjectId)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| subjectType | text | NO | - | - |
| subjectId | text | NO | - | - |
| name | text | NO | - | - |
| model | text | NO | - | - |
| consentAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| consentBy | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | - |

### FaceEvent

```text
FaceEvent(id, schoolId, kind, confidence, cameraId, note, createdAt)
PK (id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | - | - |
| kind | text | NO | - | - |
| confidence | double precision | NO | - | 0 |
| cameraId | text | NO | - | 'kiosk-1'::text |
| note | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### Fee

```text
Fee(id, schoolId, studentId, title, amount, paid, dueDate, status, createdAt)
PK (id)
FK (schoolId) -> School(id)
FK (studentId) -> Student(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| studentId | text | NO | FK | - |
| title | text | NO | - | - |
| amount | numeric(12,2) | NO | - | - |
| paid | numeric(12,2) | NO | - | 0 |
| dueDate | text | NO | - | - |
| status | text | NO | - | 'PENDING'::text |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

CHECK constraints:

- `Fee_dueDate_calendar`: `CHECK (valid_calendar_date("dueDate"))`
- `fee_balance_check`: `CHECK (((amount > (0)::numeric) AND (paid >= (0)::numeric) AND (paid <= amount)))`

### KnowledgeItem

```text
KnowledgeItem(id, schoolId, title, content, category, sourceId, createdBy, model, embedding, revision, createdAt, updatedAt)
PK (id)
FK (schoolId) -> School(id)
FK (createdBy) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| title | text | NO | - | - |
| content | text | NO | - | - |
| category | text | NO | - | - |
| sourceId | text | YES | - | - |
| createdBy | text | NO | FK | - |
| model | text | NO | - | 'Xenova/all-MiniLM-L6-v2'::text |
| embedding | vector(384) | NO | - | - |
| revision | integer | NO | - | 1 |
| createdAt | timestamp with time zone | NO | - | now() |
| updatedAt | timestamp with time zone | NO | - | now() |

CHECK constraints:

- `KnowledgeItem_category_check`: `CHECK ((category = ANY (ARRAY['POLICY'::text, 'NOTICE'::text, 'DOCUMENT'::text])))`
- `KnowledgeItem_content_check`: `CHECK (((length(TRIM(BOTH FROM content)) >= 20) AND (length(TRIM(BOTH FROM content)) <= 12000)))`
- `KnowledgeItem_embedding_check`: `CHECK ((vector_norm(embedding) > (0)::double precision))`
- `KnowledgeItem_model_check`: `CHECK ((model = 'Xenova/all-MiniLM-L6-v2'::text))`
- `KnowledgeItem_revision_check`: `CHECK ((revision > 0))`
- `KnowledgeItem_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)))`

### KnowledgeRevision

```text
KnowledgeRevision(id, itemId, schoolId, operation, actorId, revision, changedAt)
PK (id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | bigint | NO | PK | nextval('"KnowledgeRevision_id_seq"'::regclass) |
| itemId | text | NO | - | - |
| schoolId | text | NO | - | - |
| operation | text | NO | - | - |
| actorId | text | YES | - | - |
| revision | integer | NO | - | - |
| changedAt | timestamp with time zone | NO | - | now() |

### Notification

```text
Notification(id, schoolId, userId, title, body, severity, category, actionString, createdAt)
PK (id)
FK (schoolId) -> School(id)
FK (userId) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| userId | text | YES | FK | - |
| title | text | NO | - | - |
| body | text | NO | - | - |
| severity | text | NO | - | 'INFO'::text |
| category | text | NO | - | 'GENERAL'::text |
| actionString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### NotificationRead

```text
NotificationRead(id, notificationId, userId, readAt)
PK (id)
UQ (notificationId, userId)
FK (notificationId) -> Notification(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| notificationId | text | NO | FK | - |
| userId | text | NO | - | - |
| readAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### Parent

```text
Parent(id, schoolId, userId, relation, createdAt)
PK (id)
UQ (userId)
FK (schoolId) -> School(id)
FK (userId) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| userId | text | NO | FK, UQ | - |
| relation | text | NO | - | 'Guardian'::text |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### Payment

```text
Payment(id, feeId, amount, method, reference, paidAt)
PK (id)
FK (feeId) -> Fee(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| feeId | text | NO | FK | - |
| amount | numeric(12,2) | NO | - | - |
| method | text | NO | - | 'CASH'::text |
| reference | text | YES | - | - |
| paidAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

CHECK constraints:

- `payment_positive_check`: `CHECK ((amount > (0)::numeric))`

### Prediction

```text
Prediction(id, schoolId, kind, targetDate, label, value, confidence, driversString, createdAt)
PK (id)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| kind | text | NO | - | - |
| targetDate | text | NO | - | - |
| label | text | NO | - | - |
| value | double precision | NO | - | - |
| confidence | double precision | NO | - | - |
| driversString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

CHECK constraints:

- `Prediction_targetDate_calendar`: `CHECK (valid_calendar_date("targetDate"))`

### PushDevice

```text
PushDevice(id, schoolId, userId, token, platform, tokenVersion, updatedAt, createdAt)
PK (id)
UQ (token)
FK (schoolId) -> School(id)
FK (userId) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| userId | text | NO | FK | - |
| token | text | NO | UQ | - |
| platform | text | NO | - | - |
| tokenVersion | integer | NO | - | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

CHECK constraints:

- `PushDevice_platform_check`: `CHECK ((platform = ANY (ARRAY['ANDROID'::text, 'IOS'::text, 'WEB'::text])))`

### Room

```text
Room(id, buildingId, name, type, capacity, floor, hasProjector, unavailableString)
PK (id)
FK (buildingId) -> Building(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| buildingId | text | NO | FK | - |
| name | text | NO | - | - |
| type | text | NO | - | 'CLASSROOM'::text |
| capacity | integer | NO | - | 40 |
| floor | integer | NO | - | 0 |
| hasProjector | boolean | NO | - | false |
| unavailableString | text | YES | - | - |

### School

```text
School(id, name, code, address, phone, logoUrl, createdAt, updatedAt)
PK (id)
UQ (code)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| name | text | NO | - | - |
| code | text | NO | UQ | - |
| address | text | YES | - | - |
| phone | text | YES | - | - |
| logoUrl | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | - |

### Setting

```text
Setting(id, schoolId, key, valueString)
PK (id)
UQ (schoolId, key)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| key | text | NO | - | - |
| valueString | text | NO | - | - |

### StaffAbsence

```text
StaffAbsence(id, teacherId, date, reason, createdAt)
PK (id)
UQ (teacherId, date)
FK (teacherId) -> Teacher(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| teacherId | text | NO | FK | - |
| date | text | NO | - | - |
| reason | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

CHECK constraints:

- `StaffAbsence_date_calendar`: `CHECK (valid_calendar_date(date))`

### Student

```text
Student(id, schoolId, userId, admissionNo, rollNo, name, gender, dob, bloodGroup, photoUrl, email, phone, address, pincode, guardianName, fatherName, motherName, emergencyContact, classId, active, faceEnrolled, faceCount, createdAt, updatedAt)
PK (id)
UQ (schoolId, admissionNo)
UQ (userId)
FK (classId) -> Class(id)
FK (schoolId) -> School(id)
FK (userId) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| userId | text | YES | FK, UQ | - |
| admissionNo | text | NO | - | - |
| rollNo | integer | NO | - | - |
| name | text | NO | - | - |
| gender | text | YES | - | - |
| dob | timestamp(3) without time zone | YES | - | - |
| bloodGroup | text | YES | - | - |
| photoUrl | text | YES | - | - |
| email | text | YES | - | - |
| phone | text | YES | - | - |
| address | text | YES | - | - |
| pincode | text | YES | - | - |
| guardianName | text | YES | - | - |
| fatherName | text | YES | - | - |
| motherName | text | YES | - | - |
| emergencyContact | text | YES | - | - |
| classId | text | YES | FK | - |
| active | boolean | NO | - | true |
| faceEnrolled | boolean | NO | - | false |
| faceCount | integer | NO | - | 0 |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | - |

CHECK constraints:

- `student_positive_roll`: `CHECK ((("rollNo" > 0) AND (length(TRIM(BOTH FROM "admissionNo")) > 0)))`

### StudentParent

```text
StudentParent(id, studentId, parentId)
PK (id)
UQ (studentId, parentId)
FK (parentId) -> Parent(id)
FK (studentId) -> Student(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| studentId | text | NO | FK | - |
| parentId | text | NO | FK | - |

### Subject

```text
Subject(id, schoolId, code, name, color, weeklyLoad, requiresLab, cognitiveLoad)
PK (id)
UQ (schoolId, code)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| code | text | NO | - | - |
| name | text | NO | - | - |
| color | text | NO | - | '#0E7C6B'::text |
| weeklyLoad | integer | NO | - | 5 |
| requiresLab | boolean | NO | - | false |
| cognitiveLoad | integer | NO | - | 3 |

### Substitution

```text
Substitution(id, absenceId, subTeacherId, day, period, classId, subjectId, reasonString, confidence, accepted, createdAt)
PK (id)
FK (absenceId) -> StaffAbsence(id)
FK (subTeacherId) -> Teacher(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| absenceId | text | NO | FK | - |
| subTeacherId | text | NO | FK | - |
| day | integer | NO | - | - |
| period | integer | NO | - | - |
| classId | text | YES | - | - |
| subjectId | text | YES | - | - |
| reasonString | text | YES | - | - |
| confidence | double precision | NO | - | 0 |
| accepted | boolean | NO | - | false |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### Teacher

```text
Teacher(id, schoolId, userId, employeeId, department, qualification, maxHours, weeklyHours, subjectsString, maxDailyPeriods, maxConsecutive, partTime, unavailableString, preferredFreeString, faceEnrolled, faceCount, createdAt, updatedAt)
PK (id)
UQ (userId)
FK (schoolId) -> School(id)
FK (userId) -> User(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| userId | text | NO | FK, UQ | - |
| employeeId | text | NO | - | - |
| department | text | NO | - | - |
| qualification | text | YES | - | - |
| maxHours | integer | NO | - | 24 |
| weeklyHours | integer | NO | - | 0 |
| subjectsString | text | YES | - | - |
| maxDailyPeriods | integer | NO | - | 6 |
| maxConsecutive | integer | NO | - | 3 |
| partTime | boolean | NO | - | false |
| unavailableString | text | YES | - | - |
| preferredFreeString | text | YES | - | - |
| faceEnrolled | boolean | NO | - | false |
| faceCount | integer | NO | - | 0 |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | - |

### Timetable

```text
Timetable(id, schoolId, name, status, version, active, solveMs, score, healthString, generatedByName, approvedByName, approvedAt, publishedByName, publishedAt, createdAt, updatedAt)
PK (id)
PARTIAL UQ (schoolId) WHERE (active AND (status = 'PUBLISHED'::text))
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| name | text | NO | - | - |
| status | text | NO | - | 'DRAFT'::text |
| version | integer | NO | - | 0 |
| active | boolean | NO | - | false |
| solveMs | integer | NO | - | 0 |
| score | double precision | NO | - | 0 |
| healthString | text | YES | - | - |
| generatedByName | text | YES | - | - |
| approvedByName | text | YES | - | - |
| approvedAt | timestamp(3) without time zone | YES | - | - |
| publishedByName | text | YES | - | - |
| publishedAt | timestamp(3) without time zone | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |

### TimetableSlot

```text
TimetableSlot(id, timetableId, day, period, classId, subjectId, teacherId, roomId, locked, explainString)
PK (id)
UQ (timetableId, classId, day, period)
UQ (timetableId, roomId, day, period)
UQ (timetableId, teacherId, day, period)
FK (classId) -> Class(id)
FK (roomId) -> Room(id)
FK (subjectId) -> Subject(id)
FK (teacherId) -> Teacher(id)
FK (timetableId) -> Timetable(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| timetableId | text | NO | FK | - |
| day | integer | NO | - | - |
| period | integer | NO | - | - |
| classId | text | NO | FK | - |
| subjectId | text | NO | FK | - |
| teacherId | text | NO | FK | - |
| roomId | text | YES | FK | - |
| locked | boolean | NO | - | false |
| explainString | text | YES | - | - |

### User

```text
User(id, schoolId, email, password, name, role, phone, avatarUrl, active, mustChangePassword, tokenVersion, failedLogins, lockedUntil, lastLoginIp, lastLogin, createdAt, updatedAt)
PK (id)
UQ (email)
FK (schoolId) -> School(id)
```

| Attribute | PostgreSQL type | NULL allowed | Key membership | Default expression |
| --- | --- | --- | --- | --- |
| id | text | NO | PK | - |
| schoolId | text | NO | FK | - |
| email | text | NO | UQ | - |
| password | text | NO | - | - |
| name | text | NO | - | - |
| role | text | NO | - | - |
| phone | text | YES | - | - |
| avatarUrl | text | YES | - | - |
| active | boolean | NO | - | true |
| mustChangePassword | boolean | NO | - | false |
| tokenVersion | integer | NO | - | 0 |
| failedLogins | integer | NO | - | 0 |
| lockedUntil | timestamp(3) without time zone | YES | - | - |
| lastLoginIp | text | YES | - | - |
| lastLogin | timestamp(3) without time zone | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | - | CURRENT_TIMESTAMP |
| updatedAt | timestamp(3) without time zone | NO | - | - |

CHECK constraints:

- `user_role_check`: `CHECK ((role = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text, 'PRINCIPAL'::text, 'TEACHER'::text, 'STUDENT'::text, 'PARENT'::text])))`
