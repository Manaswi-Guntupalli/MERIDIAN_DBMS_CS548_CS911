# Current database schema and data dictionary

[Saved Chen ER and relational-schema images](diagrams/README.md) | [Detailed ER-to-relational mapping](diagrams/RELATIONAL_MAPPING.md)

Read from PostgreSQL system catalogues on 2026-11-10T09:10:12.440Z. **43 application tables**; Prisma migration bookkeeping is excluded. This is schema metadata, not an export of student records, passwords or biometric values.

The primary/foreign keys below are database constraints. Prisma implements several composite uniqueness rules with UNIQUE indexes, which are listed separately. A column belonging to a composite unique index is not necessarily unique on its own. PostgreSQL quoting is required for names such as `"Student"` and `"schoolId"`.

## AILog

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| engine | text | NO | - | - |
| action | text | NO | - | - |
| reason | text | YES | - | - |
| confidence | double precision | YES | - | - |
| inputString | text | YES | - | - |
| outputString | text | YES | - | - |
| actorId | text | YES | - | FK |
| reversible | boolean | NO | true | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `AILog_actorId_fkey`: `FOREIGN KEY ("actorId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `AILog_pkey`: `PRIMARY KEY (id)`
- `AILog_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `AILog_pkey`: `CREATE UNIQUE INDEX "AILog_pkey" ON public."AILog" USING btree (id)`

## AcademicConfig

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| academicYear | text | NO | '2026-27'::text | - |
| termsString | text | YES | - | - |
| workingDays | integer | NO | 5 | - |
| dayStart | text | NO | '08:00'::text | - |
| periodMinutes | integer | NO | 45 | - |
| periodsPerDay | integer | NO | 8 | - |
| breaksString | text | YES | - | - |
| blockedString | text | YES | - | - |
| holidaysString | text | YES | - | - |
| examWeeksString | text | YES | - | - |
| updatedAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `AcademicConfig_pkey`: `PRIMARY KEY (id)`
- `AcademicConfig_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `AcademicConfig_pkey`: `CREATE UNIQUE INDEX "AcademicConfig_pkey" ON public."AcademicConfig" USING btree (id)`
- `AcademicConfig_schoolId_key`: `CREATE UNIQUE INDEX "AcademicConfig_schoolId_key" ON public."AcademicConfig" USING btree ("schoolId")`

## Attendance

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| studentId | text | NO | - | FK |
| classId | text | NO | - | FK |
| date | text | NO | - | - |
| status | text | NO | 'PRESENT'::text | - |
| source | text | NO | 'MANUAL'::text | - |
| confidence | double precision | YES | - | - |
| markedById | text | YES | - | - |
| timestamp | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Attendance_classId_fkey`: `FOREIGN KEY ("classId") REFERENCES "Class"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Attendance_date_calendar`: `CHECK (valid_calendar_date(date))`
- `Attendance_pkey`: `PRIMARY KEY (id)`
- `Attendance_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Attendance_studentId_fkey`: `FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `attendance_status_check`: `CHECK ((status = ANY (ARRAY['PRESENT'::text, 'ABSENT'::text, 'LATE'::text, 'LEAVE'::text])))`

Indexes (including UNIQUE indexes):

- `Attendance_pkey`: `CREATE UNIQUE INDEX "Attendance_pkey" ON public."Attendance" USING btree (id)`
- `Attendance_schoolId_date_idx`: `CREATE INDEX "Attendance_schoolId_date_idx" ON public."Attendance" USING btree ("schoolId", date)`
- `Attendance_studentId_date_key`: `CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON public."Attendance" USING btree ("studentId", date)`

## AttendanceEvent

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| studentId | text | YES | - | FK |
| sessionId | text | YES | - | FK |
| verificationId | text | YES | - | - |
| source | text | NO | - | - |
| timestamp | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| direction | text | NO | 'ENTRY'::text | - |
| verificationStatus | text | NO | 'VERIFIED'::text | - |
| faceConfidence | double precision | YES | - | - |
| faceDistance | double precision | YES | - | - |
| late | boolean | NO | false | - |
| lateMinutes | integer | YES | - | - |
| createdBy | text | YES | - | - |
| notes | text | YES | - | - |

Constraints:

- `AttendanceEvent_pkey`: `PRIMARY KEY (id)`
- `AttendanceEvent_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `AttendanceEvent_sessionId_fkey`: `FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `AttendanceEvent_studentId_fkey`: `FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON UPDATE CASCADE ON DELETE SET NULL`

Indexes (including UNIQUE indexes):

- `AttendanceEvent_pkey`: `CREATE UNIQUE INDEX "AttendanceEvent_pkey" ON public."AttendanceEvent" USING btree (id)`
- `AttendanceEvent_schoolId_timestamp_idx`: `CREATE INDEX "AttendanceEvent_schoolId_timestamp_idx" ON public."AttendanceEvent" USING btree ("schoolId", "timestamp")`
- `AttendanceEvent_sessionId_idx`: `CREATE INDEX "AttendanceEvent_sessionId_idx" ON public."AttendanceEvent" USING btree ("sessionId")`
- `AttendanceEvent_studentId_timestamp_idx`: `CREATE INDEX "AttendanceEvent_studentId_timestamp_idx" ON public."AttendanceEvent" USING btree ("studentId", "timestamp")`

## AttendanceSession

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| classId | text | NO | - | FK |
| teacherId | text | NO | - | FK |
| subjectId | text | YES | - | FK |
| date | text | NO | - | - |
| status | text | NO | 'ACTIVE'::text | - |
| startTime | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| expiryTime | timestamp(3) without time zone | NO | - | - |
| closedAt | timestamp(3) without time zone | YES | - | - |
| sessionToken | text | NO | - | - |
| createdBy | text | YES | - | - |
| verificationMode | text | NO | 'QR_FACE'::text | - |

Constraints:

- `AttendanceSession_active_requires_dual`: `CHECK (((status <> 'ACTIVE'::text) OR ("verificationMode" = 'QR_FACE'::text)))`
- `AttendanceSession_classId_fkey`: `FOREIGN KEY ("classId") REFERENCES "Class"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `AttendanceSession_date_calendar`: `CHECK (valid_calendar_date(date))`
- `AttendanceSession_pkey`: `PRIMARY KEY (id)`
- `AttendanceSession_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `AttendanceSession_subjectId_fkey`: `FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `AttendanceSession_teacherId_fkey`: `FOREIGN KEY ("teacherId") REFERENCES "Teacher"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `AttendanceSession_verificationMode_check`: `CHECK (("verificationMode" = ANY (ARRAY['QR_FACE'::text, 'QR_ONLY'::text, 'FACE_REQUIRED'::text])))`

Indexes (including UNIQUE indexes):

- `AttendanceSession_classId_date_idx`: `CREATE INDEX "AttendanceSession_classId_date_idx" ON public."AttendanceSession" USING btree ("classId", date)`
- `AttendanceSession_pkey`: `CREATE UNIQUE INDEX "AttendanceSession_pkey" ON public."AttendanceSession" USING btree (id)`
- `AttendanceSession_schoolId_status_idx`: `CREATE INDEX "AttendanceSession_schoolId_status_idx" ON public."AttendanceSession" USING btree ("schoolId", status)`
- `AttendanceSession_sessionToken_key`: `CREATE UNIQUE INDEX "AttendanceSession_sessionToken_key" ON public."AttendanceSession" USING btree ("sessionToken")`

## AttendanceVerification

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| sessionId | text | NO | - | FK |
| studentId | text | NO | - | FK |
| state | text | NO | 'PENDING'::text | - |
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
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `AttendanceVerification_pkey`: `PRIMARY KEY (id)`
- `AttendanceVerification_present_requires_both`: `CHECK (((state <> 'PRESENT'::text) OR (("qrVerifiedAt" IS NOT NULL) AND ("faceVerifiedAt" IS NOT NULL) AND ("markedPresentAt" IS NOT NULL) AND ("qrVerifiedAt" <= "markedPresentAt") AND ("faceVerifiedAt" <= "markedPresentAt") AND ("faceConfidence" IS NOT NULL) AND (threshold IS NOT NULL) AND (threshold > (0)::double precision) AND (threshold <= (1)::double precision) AND ("faceConfidence" >= threshold) AND ("faceConfidence" <= (1)::double precision)))) NOT VALID`
- `AttendanceVerification_sessionId_fkey`: `FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `AttendanceVerification_studentId_fkey`: `FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `AttendanceVerification_pkey`: `CREATE UNIQUE INDEX "AttendanceVerification_pkey" ON public."AttendanceVerification" USING btree (id)`
- `AttendanceVerification_sessionId_state_idx`: `CREATE INDEX "AttendanceVerification_sessionId_state_idx" ON public."AttendanceVerification" USING btree ("sessionId", state)`
- `AttendanceVerification_sessionId_studentId_key`: `CREATE UNIQUE INDEX "AttendanceVerification_sessionId_studentId_key" ON public."AttendanceVerification" USING btree ("sessionId", "studentId")`

## AuditLog

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| actorId | text | YES | - | FK |
| action | text | NO | - | - |
| entity | text | NO | - | - |
| entityId | text | YES | - | - |
| metaString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `AuditLog_actorId_fkey`: `FOREIGN KEY ("actorId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `AuditLog_pkey`: `PRIMARY KEY (id)`
- `AuditLog_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `AuditLog_pkey`: `CREATE UNIQUE INDEX "AuditLog_pkey" ON public."AuditLog" USING btree (id)`
- `AuditLog_schoolId_createdAt_idx`: `CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON public."AuditLog" USING btree ("schoolId", "createdAt")`

## Building

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| name | text | NO | - | - |
| floors | integer | NO | 2 | - |
| x | double precision | NO | 0 | - |
| y | double precision | NO | 0 | - |

Constraints:

- `Building_pkey`: `PRIMARY KEY (id)`
- `Building_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Building_pkey`: `CREATE UNIQUE INDEX "Building_pkey" ON public."Building" USING btree (id)`

## Class

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| grade | integer | NO | - | - |
| section | text | NO | - | - |
| name | text | NO | - | - |
| roomId | text | YES | - | FK |
| classTeacherId | text | YES | - | FK |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Class_classTeacherId_fkey`: `FOREIGN KEY ("classTeacherId") REFERENCES "Teacher"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `Class_pkey`: `PRIMARY KEY (id)`
- `Class_roomId_fkey`: `FOREIGN KEY ("roomId") REFERENCES "Room"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `Class_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Class_pkey`: `CREATE UNIQUE INDEX "Class_pkey" ON public."Class" USING btree (id)`
- `Class_schoolId_grade_section_key`: `CREATE UNIQUE INDEX "Class_schoolId_grade_section_key" ON public."Class" USING btree ("schoolId", grade, section)`

## ClassSubjectPlan

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| classId | text | NO | - | FK |
| subjectId | text | NO | - | FK |
| weeklyPeriods | integer | NO | 4 | - |
| requiresLab | boolean | NO | false | - |
| elective | boolean | NO | false | - |

Constraints:

- `ClassSubjectPlan_classId_fkey`: `FOREIGN KEY ("classId") REFERENCES "Class"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `ClassSubjectPlan_pkey`: `PRIMARY KEY (id)`
- `ClassSubjectPlan_subjectId_fkey`: `FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON UPDATE CASCADE ON DELETE CASCADE`

Indexes (including UNIQUE indexes):

- `ClassSubjectPlan_classId_subjectId_key`: `CREATE UNIQUE INDEX "ClassSubjectPlan_classId_subjectId_key" ON public."ClassSubjectPlan" USING btree ("classId", "subjectId")`
- `ClassSubjectPlan_pkey`: `CREATE UNIQUE INDEX "ClassSubjectPlan_pkey" ON public."ClassSubjectPlan" USING btree (id)`

## Document

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| type | text | NO | - | - |
| typeConfidence | double precision | NO | 0 | - |
| fileName | text | NO | - | - |
| mimeType | text | NO | 'application/pdf'::text | - |
| sizeBytes | integer | NO | 0 | - |
| pageCount | integer | NO | 1 | - |
| status | text | NO | 'QUEUED'::text | - |
| overallConfidence | double precision | NO | 0 | - |
| processingMs | integer | NO | 0 | - |
| pipelineString | text | YES | - | - |
| rawText | text | YES | - | - |
| errorMessage | text | YES | - | - |
| batchId | text | YES | - | - |
| correctionCount | integer | NO | 0 | - |
| committedAt | timestamp(3) without time zone | YES | - | - |
| committedKind | text | YES | - | - |
| committedRefId | text | YES | - | - |
| uploadedById | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |

Constraints:

- `Document_pkey`: `PRIMARY KEY (id)`
- `Document_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Document_batchId_idx`: `CREATE INDEX "Document_batchId_idx" ON public."Document" USING btree ("batchId")`
- `Document_pkey`: `CREATE UNIQUE INDEX "Document_pkey" ON public."Document" USING btree (id)`
- `Document_schoolId_status_idx`: `CREATE INDEX "Document_schoolId_status_idx" ON public."Document" USING btree ("schoolId", status)`

## DocumentActivity

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| documentId | text | NO | - | FK |
| kind | text | NO | - | - |
| actorId | text | YES | - | - |
| actorName | text | YES | - | - |
| detailString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `DocumentActivity_documentId_fkey`: `FOREIGN KEY ("documentId") REFERENCES "Document"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `DocumentActivity_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `DocumentActivity_documentId_createdAt_idx`: `CREATE INDEX "DocumentActivity_documentId_createdAt_idx" ON public."DocumentActivity" USING btree ("documentId", "createdAt")`
- `DocumentActivity_pkey`: `CREATE UNIQUE INDEX "DocumentActivity_pkey" ON public."DocumentActivity" USING btree (id)`

## DocumentInsight

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| documentId | text | NO | - | FK |
| kind | text | NO | - | - |
| severity | text | NO | 'WARNING'::text | - |
| message | text | NO | - | - |
| detailString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `DocumentInsight_documentId_fkey`: `FOREIGN KEY ("documentId") REFERENCES "Document"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `DocumentInsight_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `DocumentInsight_pkey`: `CREATE UNIQUE INDEX "DocumentInsight_pkey" ON public."DocumentInsight" USING btree (id)`

## DocumentPage

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| documentId | text | NO | - | FK |
| index | integer | NO | - | - |
| width | integer | NO | - | - |
| height | integer | NO | - | - |
| source | text | NO | - | - |
| rotation | integer | NO | 0 | - |
| skewDeg | double precision | NO | 0 | - |
| ocrConfidence | double precision | NO | 0 | - |
| quality | text | YES | - | - |
| wordsString | text | YES | - | - |

Constraints:

- `DocumentPage_documentId_fkey`: `FOREIGN KEY ("documentId") REFERENCES "Document"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `DocumentPage_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `DocumentPage_documentId_index_key`: `CREATE UNIQUE INDEX "DocumentPage_documentId_index_key" ON public."DocumentPage" USING btree ("documentId", index)`
- `DocumentPage_pkey`: `CREATE UNIQUE INDEX "DocumentPage_pkey" ON public."DocumentPage" USING btree (id)`

## EmergencyAck

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| incidentId | text | NO | - | FK |
| userId | text | NO | - | - |
| userName | text | NO | - | - |
| role | text | NO | - | - |
| classId | text | YES | - | - |
| className | text | YES | - | - |
| status | text | NO | - | - |
| note | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |

Constraints:

- `EmergencyAck_incidentId_fkey`: `FOREIGN KEY ("incidentId") REFERENCES "EmergencyIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `EmergencyAck_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `EmergencyAck_incidentId_role_idx`: `CREATE INDEX "EmergencyAck_incidentId_role_idx" ON public."EmergencyAck" USING btree ("incidentId", role)`
- `EmergencyAck_incidentId_userId_key`: `CREATE UNIQUE INDEX "EmergencyAck_incidentId_userId_key" ON public."EmergencyAck" USING btree ("incidentId", "userId")`
- `EmergencyAck_pkey`: `CREATE UNIQUE INDEX "EmergencyAck_pkey" ON public."EmergencyAck" USING btree (id)`

## EmergencyEvent

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| incidentId | text | NO | - | FK |
| type | text | NO | - | - |
| message | text | NO | - | - |
| actorName | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `EmergencyEvent_incidentId_fkey`: `FOREIGN KEY ("incidentId") REFERENCES "EmergencyIncident"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `EmergencyEvent_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `EmergencyEvent_incidentId_createdAt_idx`: `CREATE INDEX "EmergencyEvent_incidentId_createdAt_idx" ON public."EmergencyEvent" USING btree ("incidentId", "createdAt")`
- `EmergencyEvent_pkey`: `CREATE UNIQUE INDEX "EmergencyEvent_pkey" ON public."EmergencyEvent" USING btree (id)`

## EmergencyIncident

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| kind | text | NO | - | - |
| severity | text | NO | 'CRITICAL'::text | - |
| status | text | NO | 'ACTIVE'::text | - |
| triggeredBy | text | YES | - | - |
| triggeredById | text | YES | - | - |
| note | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| resolvedAt | timestamp(3) without time zone | YES | - | - |
| resolvedBy | text | YES | - | - |
| resolvedById | text | YES | - | - |

Constraints:

- `EmergencyIncident_pkey`: `PRIMARY KEY (id)`
- `EmergencyIncident_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `EmergencyIncident_pkey`: `CREATE UNIQUE INDEX "EmergencyIncident_pkey" ON public."EmergencyIncident" USING btree (id)`
- `EmergencyIncident_schoolId_status_idx`: `CREATE INDEX "EmergencyIncident_schoolId_status_idx" ON public."EmergencyIncident" USING btree ("schoolId", status)`

## Event

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| type | text | NO | - | - |
| aggregate | text | NO | - | - |
| aggregateId | text | NO | - | - |
| payloadString | text | NO | - | - |
| actorId | text | YES | - | - |
| actorName | text | YES | - | - |
| reversible | boolean | NO | true | - |
| reverted | boolean | NO | false | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Event_pkey`: `PRIMARY KEY (id)`
- `Event_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Event_pkey`: `CREATE UNIQUE INDEX "Event_pkey" ON public."Event" USING btree (id)`
- `Event_schoolId_createdAt_idx`: `CREATE INDEX "Event_schoolId_createdAt_idx" ON public."Event" USING btree ("schoolId", "createdAt")`

## ExtractedField

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| documentId | text | NO | - | FK |
| key | text | NO | - | - |
| label | text | NO | - | - |
| value | text | NO | - | - |
| rawValue | text | YES | - | - |
| confidence | double precision | NO | - | - |
| ocrConfidence | double precision | NO | 0 | - |
| page | integer | NO | 0 | - |
| cropX | double precision | NO | - | - |
| cropY | double precision | NO | - | - |
| cropW | double precision | NO | - | - |
| cropH | double precision | NO | - | - |
| status | text | NO | 'AUTO'::text | - |
| source | text | NO | 'OCR'::text | - |
| valid | boolean | NO | true | - |
| validationMessage | text | YES | - | - |
| corrected | boolean | NO | false | - |
| required | boolean | NO | false | - |

Constraints:

- `ExtractedField_documentId_fkey`: `FOREIGN KEY ("documentId") REFERENCES "Document"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `ExtractedField_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `ExtractedField_documentId_status_idx`: `CREATE INDEX "ExtractedField_documentId_status_idx" ON public."ExtractedField" USING btree ("documentId", status)`
- `ExtractedField_pkey`: `CREATE UNIQUE INDEX "ExtractedField_pkey" ON public."ExtractedField" USING btree (id)`

## FaceEmbedding

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | - |
| enrollmentId | text | YES | - | FK |
| subjectType | text | NO | - | - |
| subjectId | text | NO | - | - |
| name | text | NO | - | - |
| vectorString | text | NO | - | - |
| model | text | NO | 'insightface-buffalo_l'::text | - |
| dim | integer | NO | 512 | - |
| label | text | NO | 'front'::text | - |
| quality | double precision | NO | 0 | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `FaceEmbedding_enrollmentId_fkey`: `FOREIGN KEY ("enrollmentId") REFERENCES "FaceEnrollment"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `FaceEmbedding_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `FaceEmbedding_pkey`: `CREATE UNIQUE INDEX "FaceEmbedding_pkey" ON public."FaceEmbedding" USING btree (id)`
- `FaceEmbedding_schoolId_subjectType_idx`: `CREATE INDEX "FaceEmbedding_schoolId_subjectType_idx" ON public."FaceEmbedding" USING btree ("schoolId", "subjectType")`
- `FaceEmbedding_subjectId_idx`: `CREATE INDEX "FaceEmbedding_subjectId_idx" ON public."FaceEmbedding" USING btree ("subjectId")`

## FaceEnrollment

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| subjectType | text | NO | - | - |
| subjectId | text | NO | - | - |
| name | text | NO | - | - |
| model | text | NO | - | - |
| consentAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| consentBy | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |

Constraints:

- `FaceEnrollment_pkey`: `PRIMARY KEY (id)`
- `FaceEnrollment_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `FaceEnrollment_pkey`: `CREATE UNIQUE INDEX "FaceEnrollment_pkey" ON public."FaceEnrollment" USING btree (id)`
- `FaceEnrollment_schoolId_subjectType_idx`: `CREATE INDEX "FaceEnrollment_schoolId_subjectType_idx" ON public."FaceEnrollment" USING btree ("schoolId", "subjectType")`
- `FaceEnrollment_subjectType_subjectId_key`: `CREATE UNIQUE INDEX "FaceEnrollment_subjectType_subjectId_key" ON public."FaceEnrollment" USING btree ("subjectType", "subjectId")`

## FaceEvent

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | - |
| kind | text | NO | - | - |
| confidence | double precision | NO | 0 | - |
| cameraId | text | NO | 'kiosk-1'::text | - |
| note | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `FaceEvent_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `FaceEvent_pkey`: `CREATE UNIQUE INDEX "FaceEvent_pkey" ON public."FaceEvent" USING btree (id)`
- `FaceEvent_schoolId_createdAt_idx`: `CREATE INDEX "FaceEvent_schoolId_createdAt_idx" ON public."FaceEvent" USING btree ("schoolId", "createdAt")`

## Fee

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| studentId | text | NO | - | FK |
| title | text | NO | - | - |
| amount | numeric(12,2) | NO | - | - |
| paid | numeric(12,2) | NO | 0 | - |
| dueDate | text | NO | - | - |
| status | text | NO | 'PENDING'::text | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Fee_dueDate_calendar`: `CHECK (valid_calendar_date("dueDate"))`
- `Fee_pkey`: `PRIMARY KEY (id)`
- `Fee_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Fee_studentId_fkey`: `FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `fee_balance_check`: `CHECK (((amount > (0)::numeric) AND (paid >= (0)::numeric) AND (paid <= amount)))`

Indexes (including UNIQUE indexes):

- `Fee_pkey`: `CREATE UNIQUE INDEX "Fee_pkey" ON public."Fee" USING btree (id)`
- `fee_school_due`: `CREATE INDEX fee_school_due ON public."Fee" USING btree ("schoolId", "dueDate")`

## KnowledgeItem

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| title | text | NO | - | - |
| content | text | NO | - | - |
| category | text | NO | - | - |
| sourceId | text | YES | - | - |
| createdBy | text | NO | - | FK |
| model | text | NO | 'Xenova/all-MiniLM-L6-v2'::text | - |
| embedding | vector(384) | NO | - | - |
| revision | integer | NO | 1 | - |
| createdAt | timestamp with time zone | NO | now() | - |
| updatedAt | timestamp with time zone | NO | now() | - |

Constraints:

- `KnowledgeItem_category_check`: `CHECK ((category = ANY (ARRAY['POLICY'::text, 'NOTICE'::text, 'DOCUMENT'::text])))`
- `KnowledgeItem_content_check`: `CHECK (((length(TRIM(BOTH FROM content)) >= 20) AND (length(TRIM(BOTH FROM content)) <= 12000)))`
- `KnowledgeItem_createdBy_fkey`: `FOREIGN KEY ("createdBy") REFERENCES "User"(id)`
- `KnowledgeItem_embedding_check`: `CHECK ((vector_norm(embedding) > (0)::double precision))`
- `KnowledgeItem_model_check`: `CHECK ((model = 'Xenova/all-MiniLM-L6-v2'::text))`
- `KnowledgeItem_pkey`: `PRIMARY KEY (id)`
- `KnowledgeItem_revision_check`: `CHECK ((revision > 0))`
- `KnowledgeItem_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE`
- `KnowledgeItem_title_check`: `CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180)))`

Indexes (including UNIQUE indexes):

- `KnowledgeItem_pkey`: `CREATE UNIQUE INDEX "KnowledgeItem_pkey" ON public."KnowledgeItem" USING btree (id)`
- `knowledge_embedding_hnsw`: `CREATE INDEX knowledge_embedding_hnsw ON public."KnowledgeItem" USING hnsw (embedding vector_cosine_ops)`
- `knowledge_fulltext`: `CREATE INDEX knowledge_fulltext ON public."KnowledgeItem" USING gin (to_tsvector('english'::regconfig, ((title || ' '::text) || content)))`
- `knowledge_school_category`: `CREATE INDEX knowledge_school_category ON public."KnowledgeItem" USING btree ("schoolId", category)`

## KnowledgeRevision

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | bigint | NO | nextval('"KnowledgeRevision_id_seq"'::regclass) | PK |
| itemId | text | NO | - | - |
| schoolId | text | NO | - | - |
| operation | text | NO | - | - |
| actorId | text | YES | - | - |
| revision | integer | NO | - | - |
| changedAt | timestamp with time zone | NO | now() | - |

Constraints:

- `KnowledgeRevision_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `KnowledgeRevision_pkey`: `CREATE UNIQUE INDEX "KnowledgeRevision_pkey" ON public."KnowledgeRevision" USING btree (id)`

## Notification

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| userId | text | YES | - | FK |
| title | text | NO | - | - |
| body | text | NO | - | - |
| severity | text | NO | 'INFO'::text | - |
| category | text | NO | 'GENERAL'::text | - |
| actionString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Notification_pkey`: `PRIMARY KEY (id)`
- `Notification_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Notification_userId_fkey`: `FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL`

Indexes (including UNIQUE indexes):

- `Notification_pkey`: `CREATE UNIQUE INDEX "Notification_pkey" ON public."Notification" USING btree (id)`

## NotificationRead

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| notificationId | text | NO | - | FK |
| userId | text | NO | - | - |
| readAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `NotificationRead_notificationId_fkey`: `FOREIGN KEY ("notificationId") REFERENCES "Notification"(id) ON UPDATE CASCADE ON DELETE CASCADE`
- `NotificationRead_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `NotificationRead_notificationId_userId_key`: `CREATE UNIQUE INDEX "NotificationRead_notificationId_userId_key" ON public."NotificationRead" USING btree ("notificationId", "userId")`
- `NotificationRead_pkey`: `CREATE UNIQUE INDEX "NotificationRead_pkey" ON public."NotificationRead" USING btree (id)`
- `NotificationRead_userId_idx`: `CREATE INDEX "NotificationRead_userId_idx" ON public."NotificationRead" USING btree ("userId")`

## Parent

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| userId | text | NO | - | FK |
| relation | text | NO | 'Guardian'::text | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Parent_pkey`: `PRIMARY KEY (id)`
- `Parent_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Parent_userId_fkey`: `FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Parent_pkey`: `CREATE UNIQUE INDEX "Parent_pkey" ON public."Parent" USING btree (id)`
- `Parent_userId_key`: `CREATE UNIQUE INDEX "Parent_userId_key" ON public."Parent" USING btree ("userId")`

## Payment

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| feeId | text | NO | - | FK |
| amount | numeric(12,2) | NO | - | - |
| method | text | NO | 'CASH'::text | - |
| reference | text | YES | - | - |
| paidAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Payment_feeId_fkey`: `FOREIGN KEY ("feeId") REFERENCES "Fee"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Payment_pkey`: `PRIMARY KEY (id)`
- `payment_positive_check`: `CHECK ((amount > (0)::numeric))`

Indexes (including UNIQUE indexes):

- `Payment_pkey`: `CREATE UNIQUE INDEX "Payment_pkey" ON public."Payment" USING btree (id)`

## Prediction

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| kind | text | NO | - | - |
| targetDate | text | NO | - | - |
| label | text | NO | - | - |
| value | double precision | NO | - | - |
| confidence | double precision | NO | - | - |
| driversString | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Prediction_pkey`: `PRIMARY KEY (id)`
- `Prediction_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Prediction_targetDate_calendar`: `CHECK (valid_calendar_date("targetDate"))`

Indexes (including UNIQUE indexes):

- `Prediction_pkey`: `CREATE UNIQUE INDEX "Prediction_pkey" ON public."Prediction" USING btree (id)`

## PushDevice

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| userId | text | NO | - | FK |
| token | text | NO | - | - |
| platform | text | NO | - | - |
| tokenVersion | integer | NO | - | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `PushDevice_pkey`: `PRIMARY KEY (id)`
- `PushDevice_platform_check`: `CHECK ((platform = ANY (ARRAY['ANDROID'::text, 'IOS'::text, 'WEB'::text])))`
- `PushDevice_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE`
- `PushDevice_userId_fkey`: `FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE`

Indexes (including UNIQUE indexes):

- `PushDevice_pkey`: `CREATE UNIQUE INDEX "PushDevice_pkey" ON public."PushDevice" USING btree (id)`
- `PushDevice_schoolId_userId_idx`: `CREATE INDEX "PushDevice_schoolId_userId_idx" ON public."PushDevice" USING btree ("schoolId", "userId")`
- `PushDevice_token_key`: `CREATE UNIQUE INDEX "PushDevice_token_key" ON public."PushDevice" USING btree (token)`

## Room

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| buildingId | text | NO | - | FK |
| name | text | NO | - | - |
| type | text | NO | 'CLASSROOM'::text | - |
| capacity | integer | NO | 40 | - |
| floor | integer | NO | 0 | - |
| hasProjector | boolean | NO | false | - |
| unavailableString | text | YES | - | - |

Constraints:

- `Room_buildingId_fkey`: `FOREIGN KEY ("buildingId") REFERENCES "Building"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Room_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `Room_pkey`: `CREATE UNIQUE INDEX "Room_pkey" ON public."Room" USING btree (id)`

## School

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| name | text | NO | - | - |
| code | text | NO | - | - |
| address | text | YES | - | - |
| phone | text | YES | - | - |
| logoUrl | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |

Constraints:

- `School_pkey`: `PRIMARY KEY (id)`

Indexes (including UNIQUE indexes):

- `School_code_key`: `CREATE UNIQUE INDEX "School_code_key" ON public."School" USING btree (code)`
- `School_pkey`: `CREATE UNIQUE INDEX "School_pkey" ON public."School" USING btree (id)`

## Setting

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| key | text | NO | - | - |
| valueString | text | NO | - | - |

Constraints:

- `Setting_pkey`: `PRIMARY KEY (id)`
- `Setting_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Setting_pkey`: `CREATE UNIQUE INDEX "Setting_pkey" ON public."Setting" USING btree (id)`
- `Setting_schoolId_key_key`: `CREATE UNIQUE INDEX "Setting_schoolId_key_key" ON public."Setting" USING btree ("schoolId", key)`

## StaffAbsence

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| teacherId | text | NO | - | FK |
| date | text | NO | - | - |
| reason | text | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `StaffAbsence_date_calendar`: `CHECK (valid_calendar_date(date))`
- `StaffAbsence_pkey`: `PRIMARY KEY (id)`
- `StaffAbsence_teacherId_fkey`: `FOREIGN KEY ("teacherId") REFERENCES "Teacher"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `StaffAbsence_pkey`: `CREATE UNIQUE INDEX "StaffAbsence_pkey" ON public."StaffAbsence" USING btree (id)`
- `StaffAbsence_teacherId_date_key`: `CREATE UNIQUE INDEX "StaffAbsence_teacherId_date_key" ON public."StaffAbsence" USING btree ("teacherId", date)`

## Student

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| userId | text | YES | - | FK |
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
| classId | text | YES | - | FK |
| active | boolean | NO | true | - |
| faceEnrolled | boolean | NO | false | - |
| faceCount | integer | NO | 0 | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |

Constraints:

- `Student_classId_fkey`: `FOREIGN KEY ("classId") REFERENCES "Class"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `Student_pkey`: `PRIMARY KEY (id)`
- `Student_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Student_userId_fkey`: `FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `student_positive_roll`: `CHECK ((("rollNo" > 0) AND (length(TRIM(BOTH FROM "admissionNo")) > 0)))`

Indexes (including UNIQUE indexes):

- `Student_pkey`: `CREATE UNIQUE INDEX "Student_pkey" ON public."Student" USING btree (id)`
- `Student_schoolId_admissionNo_key`: `CREATE UNIQUE INDEX "Student_schoolId_admissionNo_key" ON public."Student" USING btree ("schoolId", "admissionNo")`
- `Student_userId_key`: `CREATE UNIQUE INDEX "Student_userId_key" ON public."Student" USING btree ("userId")`

## StudentParent

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| studentId | text | NO | - | FK |
| parentId | text | NO | - | FK |

Constraints:

- `StudentParent_parentId_fkey`: `FOREIGN KEY ("parentId") REFERENCES "Parent"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `StudentParent_pkey`: `PRIMARY KEY (id)`
- `StudentParent_studentId_fkey`: `FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `StudentParent_pkey`: `CREATE UNIQUE INDEX "StudentParent_pkey" ON public."StudentParent" USING btree (id)`
- `StudentParent_studentId_parentId_key`: `CREATE UNIQUE INDEX "StudentParent_studentId_parentId_key" ON public."StudentParent" USING btree ("studentId", "parentId")`

## Subject

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| code | text | NO | - | - |
| name | text | NO | - | - |
| color | text | NO | '#0E7C6B'::text | - |
| weeklyLoad | integer | NO | 5 | - |
| requiresLab | boolean | NO | false | - |
| cognitiveLoad | integer | NO | 3 | - |

Constraints:

- `Subject_pkey`: `PRIMARY KEY (id)`
- `Subject_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Subject_pkey`: `CREATE UNIQUE INDEX "Subject_pkey" ON public."Subject" USING btree (id)`
- `Subject_schoolId_code_key`: `CREATE UNIQUE INDEX "Subject_schoolId_code_key" ON public."Subject" USING btree ("schoolId", code)`

## Substitution

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| absenceId | text | NO | - | FK |
| subTeacherId | text | NO | - | FK |
| day | integer | NO | - | - |
| period | integer | NO | - | - |
| classId | text | YES | - | - |
| subjectId | text | YES | - | - |
| reasonString | text | YES | - | - |
| confidence | double precision | NO | 0 | - |
| accepted | boolean | NO | false | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Substitution_absenceId_fkey`: `FOREIGN KEY ("absenceId") REFERENCES "StaffAbsence"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Substitution_pkey`: `PRIMARY KEY (id)`
- `Substitution_subTeacherId_fkey`: `FOREIGN KEY ("subTeacherId") REFERENCES "Teacher"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Substitution_pkey`: `CREATE UNIQUE INDEX "Substitution_pkey" ON public."Substitution" USING btree (id)`

## Teacher

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| userId | text | NO | - | FK |
| employeeId | text | NO | - | - |
| department | text | NO | - | - |
| qualification | text | YES | - | - |
| maxHours | integer | NO | 24 | - |
| weeklyHours | integer | NO | 0 | - |
| subjectsString | text | YES | - | - |
| maxDailyPeriods | integer | NO | 6 | - |
| maxConsecutive | integer | NO | 3 | - |
| partTime | boolean | NO | false | - |
| unavailableString | text | YES | - | - |
| preferredFreeString | text | YES | - | - |
| faceEnrolled | boolean | NO | false | - |
| faceCount | integer | NO | 0 | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |

Constraints:

- `Teacher_pkey`: `PRIMARY KEY (id)`
- `Teacher_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `Teacher_userId_fkey`: `FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Teacher_pkey`: `CREATE UNIQUE INDEX "Teacher_pkey" ON public."Teacher" USING btree (id)`
- `Teacher_userId_key`: `CREATE UNIQUE INDEX "Teacher_userId_key" ON public."Teacher" USING btree ("userId")`

## Timetable

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| name | text | NO | - | - |
| status | text | NO | 'DRAFT'::text | - |
| version | integer | NO | 0 | - |
| active | boolean | NO | false | - |
| solveMs | integer | NO | 0 | - |
| score | double precision | NO | 0 | - |
| healthString | text | YES | - | - |
| generatedByName | text | YES | - | - |
| approvedByName | text | YES | - | - |
| approvedAt | timestamp(3) without time zone | YES | - | - |
| publishedByName | text | YES | - | - |
| publishedAt | timestamp(3) without time zone | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |

Constraints:

- `Timetable_pkey`: `PRIMARY KEY (id)`
- `Timetable_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`

Indexes (including UNIQUE indexes):

- `Timetable_pkey`: `CREATE UNIQUE INDEX "Timetable_pkey" ON public."Timetable" USING btree (id)`
- `Timetable_schoolId_status_idx`: `CREATE INDEX "Timetable_schoolId_status_idx" ON public."Timetable" USING btree ("schoolId", status)`
- `one_live_timetable`: `CREATE UNIQUE INDEX one_live_timetable ON public."Timetable" USING btree ("schoolId") WHERE (active AND (status = 'PUBLISHED'::text))`

## TimetableSlot

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| timetableId | text | NO | - | FK |
| day | integer | NO | - | - |
| period | integer | NO | - | - |
| classId | text | NO | - | FK |
| subjectId | text | NO | - | FK |
| teacherId | text | NO | - | FK |
| roomId | text | YES | - | FK |
| locked | boolean | NO | false | - |
| explainString | text | YES | - | - |

Constraints:

- `TimetableSlot_classId_fkey`: `FOREIGN KEY ("classId") REFERENCES "Class"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `TimetableSlot_pkey`: `PRIMARY KEY (id)`
- `TimetableSlot_roomId_fkey`: `FOREIGN KEY ("roomId") REFERENCES "Room"(id) ON UPDATE CASCADE ON DELETE SET NULL`
- `TimetableSlot_subjectId_fkey`: `FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `TimetableSlot_teacherId_fkey`: `FOREIGN KEY ("teacherId") REFERENCES "Teacher"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `TimetableSlot_timetableId_fkey`: `FOREIGN KEY ("timetableId") REFERENCES "Timetable"(id) ON UPDATE CASCADE ON DELETE CASCADE`

Indexes (including UNIQUE indexes):

- `TimetableSlot_pkey`: `CREATE UNIQUE INDEX "TimetableSlot_pkey" ON public."TimetableSlot" USING btree (id)`
- `TimetableSlot_timetableId_classId_day_period_key`: `CREATE UNIQUE INDEX "TimetableSlot_timetableId_classId_day_period_key" ON public."TimetableSlot" USING btree ("timetableId", "classId", day, period)`
- `TimetableSlot_timetableId_day_period_idx`: `CREATE INDEX "TimetableSlot_timetableId_day_period_idx" ON public."TimetableSlot" USING btree ("timetableId", day, period)`
- `TimetableSlot_timetableId_roomId_day_period_key`: `CREATE UNIQUE INDEX "TimetableSlot_timetableId_roomId_day_period_key" ON public."TimetableSlot" USING btree ("timetableId", "roomId", day, period)`
- `TimetableSlot_timetableId_teacherId_day_period_key`: `CREATE UNIQUE INDEX "TimetableSlot_timetableId_teacherId_day_period_key" ON public."TimetableSlot" USING btree ("timetableId", "teacherId", day, period)`

## User

| Column | PostgreSQL type | Nullable | Default | Key membership |
| --- | --- | --- | --- | --- |
| id | text | NO | - | PK |
| schoolId | text | NO | - | FK |
| email | text | NO | - | - |
| password | text | NO | - | - |
| name | text | NO | - | - |
| role | text | NO | - | - |
| phone | text | YES | - | - |
| avatarUrl | text | YES | - | - |
| active | boolean | NO | true | - |
| mustChangePassword | boolean | NO | false | - |
| tokenVersion | integer | NO | 0 | - |
| failedLogins | integer | NO | 0 | - |
| lockedUntil | timestamp(3) without time zone | YES | - | - |
| lastLoginIp | text | YES | - | - |
| lastLogin | timestamp(3) without time zone | YES | - | - |
| createdAt | timestamp(3) without time zone | NO | CURRENT_TIMESTAMP | - |
| updatedAt | timestamp(3) without time zone | NO | - | - |

Constraints:

- `User_pkey`: `PRIMARY KEY (id)`
- `User_schoolId_fkey`: `FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT`
- `user_role_check`: `CHECK ((role = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text, 'PRINCIPAL'::text, 'TEACHER'::text, 'STUDENT'::text, 'PARENT'::text])))`

Indexes (including UNIQUE indexes):

- `User_email_key`: `CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email)`
- `User_pkey`: `CREATE UNIQUE INDEX "User_pkey" ON public."User" USING btree (id)`
