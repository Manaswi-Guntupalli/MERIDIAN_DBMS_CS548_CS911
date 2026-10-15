# Relational schema and data dictionary

Generated from `server/prisma/schema.prisma`. SQL constraints, policies and vector data are defined in `database/advanced.sql`. All identifiers use the quoted spelling shown below.

```mermaid
erDiagram
  School {
    String id PK
    String name
    String code UK
    String address
    String phone
    String logoUrl
    DateTime createdAt
    DateTime updatedAt
  }
  User {
    String id PK
    String schoolId FK
    String email UK
    String password
    String name
    String role
    String phone
    String avatarUrl
    Boolean active
    Boolean mustChangePassword
    Int tokenVersion
    Int failedLogins
    DateTime lockedUntil
    String lastLoginIp
    DateTime lastLogin
    DateTime createdAt
    DateTime updatedAt
  }
  Teacher {
    String id PK
    String schoolId FK
    String userId FK
    String employeeId
    String department
    String qualification
    Int maxHours
    Int weeklyHours
    String subjectsString
    Int maxDailyPeriods
    Int maxConsecutive
    Boolean partTime
    String unavailableString
    String preferredFreeString
    Boolean faceEnrolled
    Int faceCount
    DateTime createdAt
    DateTime updatedAt
  }
  Student {
    String id PK
    String schoolId FK
    String userId FK
    String admissionNo
    Int rollNo
    String name
    String gender
    DateTime dob
    String bloodGroup
    String photoUrl
    String email
    String phone
    String address
    String pincode
    String guardianName
    String fatherName
    String motherName
    String emergencyContact
    String classId FK
    Boolean active
    Boolean faceEnrolled
    Int faceCount
    DateTime createdAt
    DateTime updatedAt
  }
  Parent {
    String id PK
    String schoolId FK
    String userId FK
    String relation
    DateTime createdAt
  }
  StudentParent {
    String id PK
    String studentId FK
    String parentId FK
  }
  Class {
    String id PK
    String schoolId FK
    Int grade
    String section
    String name
    String roomId FK
    String classTeacherId FK
    DateTime createdAt
  }
  Subject {
    String id PK
    String schoolId FK
    String code
    String name
    String color
    Int weeklyLoad
    Boolean requiresLab
    Int cognitiveLoad
  }
  Building {
    String id PK
    String schoolId FK
    String name
    Int floors
    Float x
    Float y
  }
  Room {
    String id PK
    String buildingId FK
    String name
    String type
    Int capacity
    Int floor
    Boolean hasProjector
    String unavailableString
  }
  Attendance {
    String id PK
    String schoolId FK
    String studentId FK
    String classId FK
    String date
    String status
    String source
    Float confidence
    String markedById
    DateTime timestamp
  }
  AttendanceSession {
    String id PK
    String schoolId FK
    String classId FK
    String teacherId FK
    String subjectId FK
    String date
    String status
    DateTime startTime
    DateTime expiryTime
    DateTime closedAt
    String sessionToken UK
    String createdBy
  }
  AttendanceVerification {
    String id PK
    String sessionId FK
    String studentId FK
    String state
    DateTime qrVerifiedAt
    DateTime faceVerifiedAt
    Float faceConfidence
    Float faceDistance
    Float threshold
    DateTime markedPresentAt
    String proxyClaimedStudentId
    String proxyMatchedName
    String reason
    DateTime updatedAt
    DateTime createdAt
  }
  AttendanceEvent {
    String id PK
    String schoolId FK
    String studentId FK
    String sessionId FK
    String verificationId
    String source
    DateTime timestamp
    String direction
    String verificationStatus
    Float faceConfidence
    Float faceDistance
    Boolean late
    Int lateMinutes
    String createdBy
    String notes
  }
  Document {
    String id PK
    String schoolId FK
    String type
    Float typeConfidence
    String fileName
    String mimeType
    Int sizeBytes
    Int pageCount
    String status
    Float overallConfidence
    Int processingMs
    String pipelineString
    String rawText
    String errorMessage
    String batchId
    Int correctionCount
    DateTime committedAt
    String committedKind
    String committedRefId
    String uploadedById
    DateTime createdAt
    DateTime updatedAt
  }
  DocumentActivity {
    String id PK
    String documentId FK
    String kind
    String actorId
    String actorName
    String detailString
    DateTime createdAt
  }
  DocumentPage {
    String id PK
    String documentId FK
    Int index
    Int width
    Int height
    String source
    Int rotation
    Float skewDeg
    Float ocrConfidence
    String quality
    String wordsString
  }
  DocumentInsight {
    String id PK
    String documentId FK
    String kind
    String severity
    String message
    String detailString
    DateTime createdAt
  }
  ExtractedField {
    String id PK
    String documentId FK
    String key
    String label
    String value
    String rawValue
    Float confidence
    Float ocrConfidence
    Int page
    Float cropX
    Float cropY
    Float cropW
    Float cropH
    String status
    String source
    Boolean valid
    String validationMessage
    Boolean corrected
    Boolean expected
  }
  AcademicConfig {
    String id PK
    String schoolId FK
    String academicYear
    String termsString
    Int workingDays
    String dayStart
    Int periodMinutes
    Int periodsPerDay
    String breaksString
    String blockedString
    String holidaysString
    String examWeeksString
    DateTime updatedAt
  }
  ClassSubjectPlan {
    String id PK
    String classId FK
    String subjectId FK
    Int weeklyPeriods
    Boolean requiresLab
    Boolean elective
  }
  Timetable {
    String id PK
    String schoolId FK
    String name
    String status
    Int version
    Boolean active
    Int solveMs
    Float score
    String healthString
    String generatedByName
    String approvedByName
    DateTime approvedAt
    String publishedByName
    DateTime publishedAt
    DateTime createdAt
    DateTime updatedAt
  }
  TimetableSlot {
    String id PK
    String timetableId FK
    Int day
    Int period
    String classId FK
    String subjectId FK
    String teacherId FK
    String roomId FK
    Boolean locked
    String explainString
  }
  StaffAbsence {
    String id PK
    String teacherId FK
    String date
    String reason
    DateTime createdAt
  }
  Substitution {
    String id PK
    String absenceId FK
    String subTeacherId FK
    Int day
    Int period
    String classId
    String subjectId
    String reasonString
    Float confidence
    Boolean accepted
    DateTime createdAt
  }
  Fee {
    String id PK
    String schoolId FK
    String studentId FK
    String title
    Float amount
    Float paid
    String dueDate
    String status
    DateTime createdAt
  }
  Payment {
    String id PK
    String feeId FK
    Float amount
    String method
    String reference
    DateTime paidAt
  }
  Prediction {
    String id PK
    String schoolId FK
    String kind
    String targetDate
    String label
    Float value
    Float confidence
    String driversString
    DateTime createdAt
  }
  Event {
    String id PK
    String schoolId FK
    String type
    String aggregate
    String aggregateId
    String payloadString
    String actorId
    String actorName
    Boolean reversible
    Boolean reverted
    DateTime createdAt
  }
  AILog {
    String id PK
    String schoolId FK
    String engine
    String action
    String reason
    Float confidence
    String inputString
    String outputString
    String actorId FK
    Boolean reversible
    DateTime createdAt
  }
  AuditLog {
    String id PK
    String schoolId FK
    String actorId FK
    String action
    String entity
    String entityId
    String metaString
    DateTime createdAt
  }
  Notification {
    String id PK
    String schoolId FK
    String userId FK
    String title
    String body
    String severity
    String category
    String actionString
    DateTime createdAt
  }
  NotificationRead {
    String id PK
    String notificationId FK
    String userId
    DateTime readAt
  }
  EmergencyIncident {
    String id PK
    String schoolId FK
    String kind
    String severity
    String status
    String triggeredBy
    String triggeredById
    String note
    DateTime createdAt
    DateTime resolvedAt
    String resolvedBy
    String resolvedById
  }
  EmergencyAck {
    String id PK
    String incidentId FK
    String userId
    String userName
    String role
    String classId
    String className
    String status
    String note
    DateTime createdAt
    DateTime updatedAt
  }
  EmergencyEvent {
    String id PK
    String incidentId FK
    String type
    String message
    String actorName
    DateTime createdAt
  }
  Setting {
    String id PK
    String schoolId FK
    String key
    String valueString
  }
  FaceEnrollment {
    String id PK
    String schoolId FK
    String subjectType
    String subjectId
    String name
    String model
    DateTime consentAt
    String consentBy
    DateTime createdAt
    DateTime updatedAt
  }
  FaceEmbedding {
    String id PK
    String schoolId
    String enrollmentId FK
    String subjectType
    String subjectId
    String name
    String vectorString
    String model
    Int dim
    String label
    Float quality
    DateTime createdAt
  }
  FaceEvent {
    String id PK
    String schoolId
    String kind
    Float confidence
    String cameraId
    String note
    DateTime createdAt
  }
  School ||--o{ User : "schoolId"
  School ||--o{ Teacher : "schoolId"
  User ||--o{ Teacher : "userId"
  School ||--o{ Student : "schoolId"
  User |o--o{ Student : "userId"
  Class |o--o{ Student : "classId"
  School ||--o{ Parent : "schoolId"
  User ||--o{ Parent : "userId"
  Student ||--o{ StudentParent : "studentId"
  Parent ||--o{ StudentParent : "parentId"
  School ||--o{ Class : "schoolId"
  Room |o--o{ Class : "roomId"
  Teacher |o--o{ Class : "classTeacherId"
  School ||--o{ Subject : "schoolId"
  School ||--o{ Building : "schoolId"
  Building ||--o{ Room : "buildingId"
  School ||--o{ Attendance : "schoolId"
  Student ||--o{ Attendance : "studentId"
  Class ||--o{ Attendance : "classId"
  School ||--o{ AttendanceSession : "schoolId"
  Class ||--o{ AttendanceSession : "classId"
  Teacher ||--o{ AttendanceSession : "teacherId"
  Subject |o--o{ AttendanceSession : "subjectId"
  AttendanceSession ||--o{ AttendanceVerification : "sessionId"
  Student ||--o{ AttendanceVerification : "studentId"
  School ||--o{ AttendanceEvent : "schoolId"
  Student |o--o{ AttendanceEvent : "studentId"
  AttendanceSession |o--o{ AttendanceEvent : "sessionId"
  School ||--o{ Document : "schoolId"
  Document ||--o{ DocumentActivity : "documentId"
  Document ||--o{ DocumentPage : "documentId"
  Document ||--o{ DocumentInsight : "documentId"
  Document ||--o{ ExtractedField : "documentId"
  School ||--o{ AcademicConfig : "schoolId"
  Class ||--o{ ClassSubjectPlan : "classId"
  Subject ||--o{ ClassSubjectPlan : "subjectId"
  School ||--o{ Timetable : "schoolId"
  Timetable ||--o{ TimetableSlot : "timetableId"
  Class ||--o{ TimetableSlot : "classId"
  Subject ||--o{ TimetableSlot : "subjectId"
  Teacher ||--o{ TimetableSlot : "teacherId"
  Room |o--o{ TimetableSlot : "roomId"
  Teacher ||--o{ StaffAbsence : "teacherId"
  StaffAbsence ||--o{ Substitution : "absenceId"
  Teacher ||--o{ Substitution : "subTeacherId"
  School ||--o{ Fee : "schoolId"
  Student ||--o{ Fee : "studentId"
  Fee ||--o{ Payment : "feeId"
  School ||--o{ Prediction : "schoolId"
  School ||--o{ Event : "schoolId"
  School ||--o{ AILog : "schoolId"
  User |o--o{ AILog : "actorId"
  School ||--o{ AuditLog : "schoolId"
  User |o--o{ AuditLog : "actorId"
  School ||--o{ Notification : "schoolId"
  User |o--o{ Notification : "userId"
  Notification ||--o{ NotificationRead : "notificationId"
  School ||--o{ EmergencyIncident : "schoolId"
  EmergencyIncident ||--o{ EmergencyAck : "incidentId"
  EmergencyIncident ||--o{ EmergencyEvent : "incidentId"
  School ||--o{ Setting : "schoolId"
  School ||--o{ FaceEnrollment : "schoolId"
  FaceEnrollment |o--o{ FaceEmbedding : "enrollmentId"
  School ||--o{ KnowledgeItem : schoolId
  User ||--o{ KnowledgeItem : createdBy
  KnowledgeItem {
    text id PK
    text schoolId FK
    text title
    text content
    text category
    text sourceId
    text createdBy FK
    vector384 embedding
    text model
    integer revision
    timestamptz createdAt
    timestamptz updatedAt
  }
```

The full ER diagram above includes every Prisma model. Optional foreign keys permit zero or one parent; unique and composite constraints in the dictionary determine one-to-one relationships.


## School

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| name | String | required  |
| code | String | required @unique |
| address | String? | nullable  |
| phone | String? | nullable  |
| logoUrl | String? | nullable  |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @updatedAt |

## User

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| email | String | required @unique |
| password | String | required  |
| name | String | required  |
| role | String | required  |
| phone | String? | nullable  |
| avatarUrl | String? | nullable  |
| active | Boolean | required @default(true) |
| mustChangePassword | Boolean | required @default(false) |
| tokenVersion | Int | required @default(0) |
| failedLogins | Int | required @default(0) |
| lockedUntil | DateTime? | nullable  |
| lastLoginIp | String? | nullable  |
| lastLogin | DateTime? | nullable  |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @updatedAt |

## Teacher

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| userId | String | required FOREIGN KEY; @unique |
| employeeId | String | required  |
| department | String | required  |
| qualification | String? | nullable  |
| maxHours | Int | required @default(24) |
| weeklyHours | Int | required @default(0) |
| subjectsString | String? | nullable  |
| maxDailyPeriods | Int | required @default(6) |
| maxConsecutive | Int | required @default(3) |
| partTime | Boolean | required @default(false) |
| unavailableString | String? | nullable  |
| preferredFreeString | String? | nullable  |
| faceEnrolled | Boolean | required @default(false) |
| faceCount | Int | required @default(0) |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @updatedAt |

## Student

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| userId | String? | nullable FOREIGN KEY; @unique |
| admissionNo | String | required  |
| rollNo | Int | required  |
| name | String | required  |
| gender | String? | nullable  |
| dob | DateTime? | nullable  |
| bloodGroup | String? | nullable  |
| photoUrl | String? | nullable  |
| email | String? | nullable  |
| phone | String? | nullable  |
| address | String? | nullable  |
| pincode | String? | nullable  |
| guardianName | String? | nullable  |
| fatherName | String? | nullable  |
| motherName | String? | nullable  |
| emergencyContact | String? | nullable  |
| classId | String? | nullable FOREIGN KEY;  |
| active | Boolean | required @default(true) |
| faceEnrolled | Boolean | required @default(false) |
| faceCount | Int | required @default(0) |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @updatedAt |

## Parent

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| userId | String | required FOREIGN KEY; @unique |
| relation | String | required @default("Guardian") |
| createdAt | DateTime | required @default(now()) |

## StudentParent

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| studentId | String | required FOREIGN KEY;  |
| parentId | String | required FOREIGN KEY;  |

Constraint: `@@unique([studentId, parentId])`


## Class

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| grade | Int | required  |
| section | String | required  |
| name | String | required  |
| roomId | String? | nullable FOREIGN KEY;  |
| classTeacherId | String? | nullable FOREIGN KEY;  |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@unique([schoolId, grade, section])`


## Subject

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| code | String | required  |
| name | String | required  |
| color | String | required @default("#0E7C6B") |
| weeklyLoad | Int | required @default(5) |
| requiresLab | Boolean | required @default(false) |
| cognitiveLoad | Int | required @default(3) |

Constraint: `@@unique([schoolId, code])`


## Building

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| name | String | required  |
| floors | Int | required @default(2) |
| x | Float | required @default(0) |
| y | Float | required @default(0) |

## Room

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| buildingId | String | required FOREIGN KEY;  |
| name | String | required  |
| type | String | required @default("CLASSROOM") |
| capacity | Int | required @default(40) |
| floor | Int | required @default(0) |
| hasProjector | Boolean | required @default(false) |
| unavailableString | String? | nullable  |

## Attendance

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| studentId | String | required FOREIGN KEY;  |
| classId | String | required FOREIGN KEY;  |
| date | String | required  |
| status | String | required @default("PRESENT") |
| source | String | required @default("MANUAL") |
| confidence | Float? | nullable  |
| markedById | String? | nullable  |
| timestamp | DateTime | required @default(now()) |

Constraint: `@@unique([studentId, date])`


Constraint: `@@index([schoolId, date])`


## AttendanceSession

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| classId | String | required FOREIGN KEY;  |
| teacherId | String | required FOREIGN KEY;  |
| subjectId | String? | nullable FOREIGN KEY;  |
| date | String | required  |
| status | String | required @default("ACTIVE") |
| startTime | DateTime | required @default(now()) |
| expiryTime | DateTime | required  |
| closedAt | DateTime? | nullable  |
| sessionToken | String | required @unique |
| createdBy | String? | nullable  |

Constraint: `@@index([schoolId, status])`


Constraint: `@@index([classId, date])`


## AttendanceVerification

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| sessionId | String | required FOREIGN KEY;  |
| studentId | String | required FOREIGN KEY;  |
| state | String | required @default("PENDING") |
| qrVerifiedAt | DateTime? | nullable  |
| faceVerifiedAt | DateTime? | nullable  |
| faceConfidence | Float? | nullable  |
| faceDistance | Float? | nullable  |
| threshold | Float? | nullable  |
| markedPresentAt | DateTime? | nullable  |
| proxyClaimedStudentId | String? | nullable  |
| proxyMatchedName | String? | nullable  |
| reason | String? | nullable  |
| updatedAt | DateTime | required @updatedAt |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@unique([sessionId, studentId])`


Constraint: `@@index([sessionId, state])`


## AttendanceEvent

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| studentId | String? | nullable FOREIGN KEY;  |
| sessionId | String? | nullable FOREIGN KEY;  |
| verificationId | String? | nullable  |
| source | String | required  |
| timestamp | DateTime | required @default(now()) |
| direction | String | required @default("ENTRY") |
| verificationStatus | String | required @default("VERIFIED") |
| faceConfidence | Float? | nullable  |
| faceDistance | Float? | nullable  |
| late | Boolean | required @default(false) |
| lateMinutes | Int? | nullable  |
| createdBy | String? | nullable  |
| notes | String? | nullable  |

Constraint: `@@index([schoolId, timestamp])`


Constraint: `@@index([studentId, timestamp])`


Constraint: `@@index([sessionId])`


## Document

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| type | String | required  |
| typeConfidence | Float | required @default(0) |
| fileName | String | required  |
| mimeType | String | required @default("application/pdf") |
| sizeBytes | Int | required @default(0) |
| pageCount | Int | required @default(1) |
| status | String | required @default("QUEUED") |
| overallConfidence | Float | required @default(0) |
| processingMs | Int | required @default(0) |
| pipelineString | String? | nullable  |
| rawText | String? | nullable  |
| errorMessage | String? | nullable  |
| batchId | String? | nullable  |
| correctionCount | Int | required @default(0) |
| committedAt | DateTime? | nullable  |
| committedKind | String? | nullable  |
| committedRefId | String? | nullable  |
| uploadedById | String? | nullable  |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @updatedAt |

Constraint: `@@index([schoolId, status])`


Constraint: `@@index([batchId])`


## DocumentActivity

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| documentId | String | required FOREIGN KEY;  |
| kind | String | required  |
| actorId | String? | nullable  |
| actorName | String? | nullable  |
| detailString | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@index([documentId, createdAt])`


## DocumentPage

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| documentId | String | required FOREIGN KEY;  |
| index | Int | required  |
| width | Int | required  |
| height | Int | required  |
| source | String | required  |
| rotation | Int | required @default(0) |
| skewDeg | Float | required @default(0) |
| ocrConfidence | Float | required @default(0) |
| quality | String? | nullable  |
| wordsString | String? | nullable  |

Constraint: `@@unique([documentId, index])`


## DocumentInsight

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| documentId | String | required FOREIGN KEY;  |
| kind | String | required  |
| severity | String | required @default("WARNING") |
| message | String | required  |
| detailString | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

## ExtractedField

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| documentId | String | required FOREIGN KEY;  |
| key | String | required  |
| label | String | required  |
| value | String | required  |
| rawValue | String? | nullable  |
| confidence | Float | required  |
| ocrConfidence | Float | required @default(0) |
| page | Int | required @default(0) |
| cropX | Float | required  |
| cropY | Float | required  |
| cropW | Float | required  |
| cropH | Float | required  |
| status | String | required @default("AUTO") |
| source | String | required @default("OCR") |
| valid | Boolean | required @default(true) |
| validationMessage | String? | nullable  |
| corrected | Boolean | required @default(false) |
| expected | Boolean | required @default(false) @map("required") |

Constraint: `@@index([documentId, status])`


## AcademicConfig

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY; @unique |
| academicYear | String | required @default("2026-27") |
| termsString | String? | nullable  |
| workingDays | Int | required @default(5) |
| dayStart | String | required @default("08:00") |
| periodMinutes | Int | required @default(45) |
| periodsPerDay | Int | required @default(8) |
| breaksString | String? | nullable  |
| blockedString | String? | nullable  |
| holidaysString | String? | nullable  |
| examWeeksString | String? | nullable  |
| updatedAt | DateTime | required @default(now()) @updatedAt |

## ClassSubjectPlan

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| classId | String | required FOREIGN KEY;  |
| subjectId | String | required FOREIGN KEY;  |
| weeklyPeriods | Int | required @default(4) |
| requiresLab | Boolean | required @default(false) |
| elective | Boolean | required @default(false) |

Constraint: `@@unique([classId, subjectId])`


## Timetable

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| name | String | required  |
| status | String | required @default("DRAFT") |
| version | Int | required @default(0) |
| active | Boolean | required @default(false) |
| solveMs | Int | required @default(0) |
| score | Float | required @default(0) |
| healthString | String? | nullable  |
| generatedByName | String? | nullable  |
| approvedByName | String? | nullable  |
| approvedAt | DateTime? | nullable  |
| publishedByName | String? | nullable  |
| publishedAt | DateTime? | nullable  |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @default(now()) @updatedAt |

Constraint: `@@index([schoolId, status])`


## TimetableSlot

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| timetableId | String | required FOREIGN KEY;  |
| day | Int | required  |
| period | Int | required  |
| classId | String | required FOREIGN KEY;  |
| subjectId | String | required FOREIGN KEY;  |
| teacherId | String | required FOREIGN KEY;  |
| roomId | String? | nullable FOREIGN KEY;  |
| locked | Boolean | required @default(false) |
| explainString | String? | nullable  |

Constraint: `@@unique([timetableId, classId, day, period])`


Constraint: `@@unique([timetableId, teacherId, day, period])`


Constraint: `@@unique([timetableId, roomId, day, period])`


Constraint: `@@index([timetableId, day, period])`


## StaffAbsence

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| teacherId | String | required FOREIGN KEY;  |
| date | String | required  |
| reason | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@unique([teacherId, date])`


## Substitution

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| absenceId | String | required FOREIGN KEY;  |
| subTeacherId | String | required FOREIGN KEY;  |
| day | Int | required  |
| period | Int | required  |
| classId | String? | nullable  |
| subjectId | String? | nullable  |
| reasonString | String? | nullable  |
| confidence | Float | required @default(0) |
| accepted | Boolean | required @default(false) |
| createdAt | DateTime | required @default(now()) |

## Fee

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| studentId | String | required FOREIGN KEY;  |
| title | String | required  |
| amount | Float | required  |
| paid | Float | required @default(0) |
| dueDate | String | required  |
| status | String | required @default("PENDING") |
| createdAt | DateTime | required @default(now()) |

## Payment

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| feeId | String | required FOREIGN KEY;  |
| amount | Float | required  |
| method | String | required @default("CASH") |
| reference | String? | nullable  |
| paidAt | DateTime | required @default(now()) |

## Prediction

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| kind | String | required  |
| targetDate | String | required  |
| label | String | required  |
| value | Float | required  |
| confidence | Float | required  |
| driversString | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

## Event

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| type | String | required  |
| aggregate | String | required  |
| aggregateId | String | required  |
| payloadString | String | required  |
| actorId | String? | nullable  |
| actorName | String? | nullable  |
| reversible | Boolean | required @default(true) |
| reverted | Boolean | required @default(false) |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@index([schoolId, createdAt])`


## AILog

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| engine | String | required  |
| action | String | required  |
| reason | String? | nullable  |
| confidence | Float? | nullable  |
| inputString | String? | nullable  |
| outputString | String? | nullable  |
| actorId | String? | nullable FOREIGN KEY;  |
| reversible | Boolean | required @default(true) |
| createdAt | DateTime | required @default(now()) |

## AuditLog

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| actorId | String? | nullable FOREIGN KEY;  |
| action | String | required  |
| entity | String | required  |
| entityId | String? | nullable  |
| metaString | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@index([schoolId, createdAt])`


## Notification

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| userId | String? | nullable FOREIGN KEY;  |
| title | String | required  |
| body | String | required  |
| severity | String | required @default("INFO") |
| category | String | required @default("GENERAL") |
| actionString | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

## NotificationRead

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| notificationId | String | required FOREIGN KEY;  |
| userId | String | required  |
| readAt | DateTime | required @default(now()) |

Constraint: `@@unique([notificationId, userId])`


Constraint: `@@index([userId])`


## EmergencyIncident

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| kind | String | required  |
| severity | String | required @default("CRITICAL") |
| status | String | required @default("ACTIVE") |
| triggeredBy | String? | nullable  |
| triggeredById | String? | nullable  |
| note | String? | nullable  |
| createdAt | DateTime | required @default(now()) |
| resolvedAt | DateTime? | nullable  |
| resolvedBy | String? | nullable  |
| resolvedById | String? | nullable  |

Constraint: `@@index([schoolId, status])`


## EmergencyAck

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| incidentId | String | required FOREIGN KEY;  |
| userId | String | required  |
| userName | String | required  |
| role | String | required  |
| classId | String? | nullable  |
| className | String? | nullable  |
| status | String | required  |
| note | String? | nullable  |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @updatedAt |

Constraint: `@@unique([incidentId, userId])`


Constraint: `@@index([incidentId, role])`


## EmergencyEvent

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| incidentId | String | required FOREIGN KEY;  |
| type | String | required  |
| message | String | required  |
| actorName | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@index([incidentId, createdAt])`


## Setting

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| key | String | required  |
| valueString | String | required  |

Constraint: `@@unique([schoolId, key])`


## FaceEnrollment

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required FOREIGN KEY;  |
| subjectType | String | required  |
| subjectId | String | required  |
| name | String | required  |
| model | String | required  |
| consentAt | DateTime | required @default(now()) |
| consentBy | String? | nullable  |
| createdAt | DateTime | required @default(now()) |
| updatedAt | DateTime | required @updatedAt |

Constraint: `@@unique([subjectType, subjectId])`


Constraint: `@@index([schoolId, subjectType])`


## FaceEmbedding

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required  |
| enrollmentId | String? | nullable FOREIGN KEY;  |
| subjectType | String | required  |
| subjectId | String | required  |
| name | String | required  |
| vectorString | String | required  |
| model | String | required @default("insightface-buffalo_l") |
| dim | Int | required @default(512) |
| label | String | required @default("front") |
| quality | Float | required @default(0) |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@index([schoolId, subjectType])`


Constraint: `@@index([subjectId])`


## FaceEvent

| Column | Type | Nullability / keys / defaults |
| --- | --- | --- |
| id | String | required @id @default(cuid()) |
| schoolId | String | required  |
| kind | String | required  |
| confidence | Float | required @default(0) |
| cameraId | String | required @default("kiosk-1") |
| note | String? | nullable  |
| createdAt | DateTime | required @default(now()) |

Constraint: `@@index([schoolId, createdAt])`


## KnowledgeItem (vector collection)

Primary key: id (UUID text). Foreign keys: schoolId → School.id, createdBy → User.id. Required title, content, category, model, embedding, revision, timestamps. Optional sourceId records the imported document/notice. Category is POLICY/NOTICE/DOCUMENT. Embeddings are 384-dimensional normalized sentence vectors. HNSW uses cosine distance; B-tree filters by school/category; GIN supports full-text queries. RLS filters school and live account role.

## KnowledgeRevision

Append-only trigger audit: id BIGSERIAL PK; itemId, schoolId, operation, actorId, revision, changedAt. itemId intentionally has no foreign key so delete history survives deletion. Source IDs are provenance references rather than cascading foreign keys because document and notification sources are different tables.

## Normalization

Core entities separate users, students, teachers, classes, fees and payments. StudentParent and ClassSubjectPlan represent many-to-many relationships. TimetableSlot resolves timetable/class/teacher/subject/room assignments. Payment rows are independent facts; Fee.paid is a maintained summary updated with its payment inside one locked SQL function. Existing serialized extraction/engine payloads retain their original format for compatibility.
