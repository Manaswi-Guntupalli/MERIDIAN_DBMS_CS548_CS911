# ER diagrams from the actual PostgreSQL catalogue

[Saved Chen ER and horizontal relational-schema images](diagrams/README.md) | [Detailed ER-to-relational mapping](diagrams/RELATIONAL_MAPPING.md)

The focused diagram shows the principal demonstration entities. The complete diagram includes every application table and foreign key; [SCHEMA.md](SCHEMA.md) contains all column types, constraints and indexes. Attributes named `schoolId` express tenant ownership. Polymorphic identifiers without a declared FK are validated by the installed tenant triggers and are not invented as foreign keys here.

## Core demonstration entities

```mermaid
erDiagram
  School {
    text id PK
    text name
  }
  User {
    text id PK
    text schoolId FK
    text name
    text role
  }
  Teacher {
    text id PK
    text schoolId FK
    text userId FK
  }
  Student {
    text id PK
    text schoolId FK
    text userId FK
    text admissionNo
    text name
    text classId FK
  }
  Class {
    text id PK
    text schoolId FK
    text name
    text roomId FK
    text classTeacherId FK
  }
  Fee {
    text id PK
    text schoolId FK
    text studentId FK
    text title
    numeric amount
    numeric paid
    text status
  }
  Payment {
    text id PK
    text feeId FK
    numeric amount
  }
  Attendance {
    text id PK
    text schoolId FK
    text studentId FK
    text classId FK
    text status
  }
  AttendanceSession {
    text id PK
    text schoolId FK
    text classId FK
    text teacherId FK
    text subjectId FK
    text status
  }
  AttendanceVerification {
    text id PK
    text sessionId FK
    text studentId FK
    text state
    timestamp qrVerifiedAt
    timestamp faceVerifiedAt
  }
  KnowledgeItem {
    text id PK
    text schoolId FK
    text title
    text createdBy FK
    vector embedding
  }
  AttendanceSession ||--o{ AttendanceVerification : "sessionId"
  Class ||--o{ Attendance : "classId"
  Class ||--o{ AttendanceSession : "classId"
  Class |o--o{ Student : "classId"
  Fee ||--o{ Payment : "feeId"
  School ||--o{ Attendance : "schoolId"
  School ||--o{ AttendanceSession : "schoolId"
  School ||--o{ Class : "schoolId"
  School ||--o{ Fee : "schoolId"
  School ||--o{ KnowledgeItem : "schoolId"
  School ||--o{ Student : "schoolId"
  School ||--o{ Teacher : "schoolId"
  School ||--o{ User : "schoolId"
  Student ||--o{ Attendance : "studentId"
  Student ||--o{ AttendanceVerification : "studentId"
  Student ||--o{ Fee : "studentId"
  Teacher ||--o{ AttendanceSession : "teacherId"
  Teacher |o--o{ Class : "classTeacherId"
  User ||--o{ KnowledgeItem : "createdBy"
  User |o--o| Student : "userId"
  User ||--o| Teacher : "userId"
```

## Complete current ER diagram

```mermaid
erDiagram
  AILog {
    text id PK
    text schoolId FK
    text engine
    text action
    text reason
    float8 confidence
    text inputString
    text outputString
    text actorId FK
    bool reversible
    timestamp createdAt
  }
  AcademicConfig {
    text id PK
    text schoolId FK
    text academicYear
    text termsString
    int4 workingDays
    text dayStart
    int4 periodMinutes
    int4 periodsPerDay
    text breaksString
    text blockedString
    text holidaysString
    text examWeeksString
    timestamp updatedAt
  }
  Attendance {
    text id PK
    text schoolId FK
    text studentId FK
    text classId FK
    text date
    text status
    text source
    float8 confidence
    text markedById
    timestamp timestamp
  }
  AttendanceEvent {
    text id PK
    text schoolId FK
    text studentId FK
    text sessionId FK
    text verificationId
    text source
    timestamp timestamp
    text direction
    text verificationStatus
    float8 faceConfidence
    float8 faceDistance
    bool late
    int4 lateMinutes
    text createdBy
    text notes
  }
  AttendanceSession {
    text id PK
    text schoolId FK
    text classId FK
    text teacherId FK
    text subjectId FK
    text date
    text status
    timestamp startTime
    timestamp expiryTime
    timestamp closedAt
    text sessionToken
    text createdBy
    text verificationMode
  }
  AttendanceVerification {
    text id PK
    text sessionId FK
    text studentId FK
    text state
    timestamp qrVerifiedAt
    timestamp faceVerifiedAt
    float8 faceConfidence
    float8 faceDistance
    float8 threshold
    timestamp markedPresentAt
    text proxyClaimedStudentId
    text proxyMatchedName
    text reason
    timestamp updatedAt
    timestamp createdAt
  }
  AuditLog {
    text id PK
    text schoolId FK
    text actorId FK
    text action
    text entity
    text entityId
    text metaString
    timestamp createdAt
  }
  Building {
    text id PK
    text schoolId FK
    text name
    int4 floors
    float8 x
    float8 y
  }
  Class {
    text id PK
    text schoolId FK
    int4 grade
    text section
    text name
    text roomId FK
    text classTeacherId FK
    timestamp createdAt
  }
  ClassSubjectPlan {
    text id PK
    text classId FK
    text subjectId FK
    int4 weeklyPeriods
    bool requiresLab
    bool elective
  }
  Document {
    text id PK
    text schoolId FK
    text type
    float8 typeConfidence
    text fileName
    text mimeType
    int4 sizeBytes
    int4 pageCount
    text status
    float8 overallConfidence
    int4 processingMs
    text pipelineString
    text rawText
    text errorMessage
    text batchId
    int4 correctionCount
    timestamp committedAt
    text committedKind
    text committedRefId
    text uploadedById
    timestamp createdAt
    timestamp updatedAt
  }
  DocumentActivity {
    text id PK
    text documentId FK
    text kind
    text actorId
    text actorName
    text detailString
    timestamp createdAt
  }
  DocumentInsight {
    text id PK
    text documentId FK
    text kind
    text severity
    text message
    text detailString
    timestamp createdAt
  }
  DocumentPage {
    text id PK
    text documentId FK
    int4 index
    int4 width
    int4 height
    text source
    int4 rotation
    float8 skewDeg
    float8 ocrConfidence
    text quality
    text wordsString
  }
  EmergencyAck {
    text id PK
    text incidentId FK
    text userId
    text userName
    text role
    text classId
    text className
    text status
    text note
    timestamp createdAt
    timestamp updatedAt
  }
  EmergencyEvent {
    text id PK
    text incidentId FK
    text type
    text message
    text actorName
    timestamp createdAt
  }
  EmergencyIncident {
    text id PK
    text schoolId FK
    text kind
    text severity
    text status
    text triggeredBy
    text triggeredById
    text note
    timestamp createdAt
    timestamp resolvedAt
    text resolvedBy
    text resolvedById
  }
  Event {
    text id PK
    text schoolId FK
    text type
    text aggregate
    text aggregateId
    text payloadString
    text actorId
    text actorName
    bool reversible
    bool reverted
    timestamp createdAt
  }
  ExtractedField {
    text id PK
    text documentId FK
    text key
    text label
    text value
    text rawValue
    float8 confidence
    float8 ocrConfidence
    int4 page
    float8 cropX
    float8 cropY
    float8 cropW
    float8 cropH
    text status
    text source
    bool valid
    text validationMessage
    bool corrected
    bool required
  }
  FaceEmbedding {
    text id PK
    text schoolId
    text enrollmentId FK
    text subjectType
    text subjectId
    text name
    text vectorString
    text model
    int4 dim
    text label
    float8 quality
    timestamp createdAt
  }
  FaceEnrollment {
    text id PK
    text schoolId FK
    text subjectType
    text subjectId
    text name
    text model
    timestamp consentAt
    text consentBy
    timestamp createdAt
    timestamp updatedAt
  }
  FaceEvent {
    text id PK
    text schoolId
    text kind
    float8 confidence
    text cameraId
    text note
    timestamp createdAt
  }
  Fee {
    text id PK
    text schoolId FK
    text studentId FK
    text title
    numeric amount
    numeric paid
    text dueDate
    text status
    timestamp createdAt
  }
  KnowledgeItem {
    text id PK
    text schoolId FK
    text title
    text content
    text category
    text sourceId
    text createdBy FK
    text model
    vector embedding
    int4 revision
    timestamptz createdAt
    timestamptz updatedAt
  }
  KnowledgeRevision {
    int8 id PK
    text itemId
    text schoolId
    text operation
    text actorId
    int4 revision
    timestamptz changedAt
  }
  Notification {
    text id PK
    text schoolId FK
    text userId FK
    text title
    text body
    text severity
    text category
    text actionString
    timestamp createdAt
  }
  NotificationRead {
    text id PK
    text notificationId FK
    text userId
    timestamp readAt
  }
  Parent {
    text id PK
    text schoolId FK
    text userId FK
    text relation
    timestamp createdAt
  }
  Payment {
    text id PK
    text feeId FK
    numeric amount
    text method
    text reference
    timestamp paidAt
  }
  Prediction {
    text id PK
    text schoolId FK
    text kind
    text targetDate
    text label
    float8 value
    float8 confidence
    text driversString
    timestamp createdAt
  }
  PushDevice {
    text id PK
    text schoolId FK
    text userId FK
    text token
    text platform
    int4 tokenVersion
    timestamp updatedAt
    timestamp createdAt
  }
  Room {
    text id PK
    text buildingId FK
    text name
    text type
    int4 capacity
    int4 floor
    bool hasProjector
    text unavailableString
  }
  School {
    text id PK
    text name
    text code
    text address
    text phone
    text logoUrl
    timestamp createdAt
    timestamp updatedAt
  }
  Setting {
    text id PK
    text schoolId FK
    text key
    text valueString
  }
  StaffAbsence {
    text id PK
    text teacherId FK
    text date
    text reason
    timestamp createdAt
  }
  Student {
    text id PK
    text schoolId FK
    text userId FK
    text admissionNo
    int4 rollNo
    text name
    text gender
    timestamp dob
    text bloodGroup
    text photoUrl
    text email
    text phone
    text address
    text pincode
    text guardianName
    text fatherName
    text motherName
    text emergencyContact
    text classId FK
    bool active
    bool faceEnrolled
    int4 faceCount
    timestamp createdAt
    timestamp updatedAt
  }
  StudentParent {
    text id PK
    text studentId FK
    text parentId FK
  }
  Subject {
    text id PK
    text schoolId FK
    text code
    text name
    text color
    int4 weeklyLoad
    bool requiresLab
    int4 cognitiveLoad
  }
  Substitution {
    text id PK
    text absenceId FK
    text subTeacherId FK
    int4 day
    int4 period
    text classId
    text subjectId
    text reasonString
    float8 confidence
    bool accepted
    timestamp createdAt
  }
  Teacher {
    text id PK
    text schoolId FK
    text userId FK
    text employeeId
    text department
    text qualification
    int4 maxHours
    int4 weeklyHours
    text subjectsString
    int4 maxDailyPeriods
    int4 maxConsecutive
    bool partTime
    text unavailableString
    text preferredFreeString
    bool faceEnrolled
    int4 faceCount
    timestamp createdAt
    timestamp updatedAt
  }
  Timetable {
    text id PK
    text schoolId FK
    text name
    text status
    int4 version
    bool active
    int4 solveMs
    float8 score
    text healthString
    text generatedByName
    text approvedByName
    timestamp approvedAt
    text publishedByName
    timestamp publishedAt
    timestamp createdAt
    timestamp updatedAt
  }
  TimetableSlot {
    text id PK
    text timetableId FK
    int4 day
    int4 period
    text classId FK
    text subjectId FK
    text teacherId FK
    text roomId FK
    bool locked
    text explainString
  }
  User {
    text id PK
    text schoolId FK
    text email
    text password
    text name
    text role
    text phone
    text avatarUrl
    bool active
    bool mustChangePassword
    int4 tokenVersion
    int4 failedLogins
    timestamp lockedUntil
    text lastLoginIp
    timestamp lastLogin
    timestamp createdAt
    timestamp updatedAt
  }
  AttendanceSession |o--o{ AttendanceEvent : "sessionId"
  AttendanceSession ||--o{ AttendanceVerification : "sessionId"
  Building ||--o{ Room : "buildingId"
  Class ||--o{ Attendance : "classId"
  Class ||--o{ AttendanceSession : "classId"
  Class ||--o{ ClassSubjectPlan : "classId"
  Class |o--o{ Student : "classId"
  Class ||--o{ TimetableSlot : "classId"
  Document ||--o{ DocumentActivity : "documentId"
  Document ||--o{ DocumentInsight : "documentId"
  Document ||--o{ DocumentPage : "documentId"
  Document ||--o{ ExtractedField : "documentId"
  EmergencyIncident ||--o{ EmergencyAck : "incidentId"
  EmergencyIncident ||--o{ EmergencyEvent : "incidentId"
  FaceEnrollment |o--o{ FaceEmbedding : "enrollmentId"
  Fee ||--o{ Payment : "feeId"
  Notification ||--o{ NotificationRead : "notificationId"
  Parent ||--o{ StudentParent : "parentId"
  Room |o--o{ Class : "roomId"
  Room |o--o{ TimetableSlot : "roomId"
  School ||--o{ AILog : "schoolId"
  School ||--o| AcademicConfig : "schoolId"
  School ||--o{ Attendance : "schoolId"
  School ||--o{ AttendanceEvent : "schoolId"
  School ||--o{ AttendanceSession : "schoolId"
  School ||--o{ AuditLog : "schoolId"
  School ||--o{ Building : "schoolId"
  School ||--o{ Class : "schoolId"
  School ||--o{ Document : "schoolId"
  School ||--o{ EmergencyIncident : "schoolId"
  School ||--o{ Event : "schoolId"
  School ||--o{ FaceEnrollment : "schoolId"
  School ||--o{ Fee : "schoolId"
  School ||--o{ KnowledgeItem : "schoolId"
  School ||--o{ Notification : "schoolId"
  School ||--o{ Parent : "schoolId"
  School ||--o{ Prediction : "schoolId"
  School ||--o{ PushDevice : "schoolId"
  School ||--o{ Setting : "schoolId"
  School ||--o{ Student : "schoolId"
  School ||--o{ Subject : "schoolId"
  School ||--o{ Teacher : "schoolId"
  School ||--o{ Timetable : "schoolId"
  School ||--o{ User : "schoolId"
  StaffAbsence ||--o{ Substitution : "absenceId"
  Student ||--o{ Attendance : "studentId"
  Student |o--o{ AttendanceEvent : "studentId"
  Student ||--o{ AttendanceVerification : "studentId"
  Student ||--o{ Fee : "studentId"
  Student ||--o{ StudentParent : "studentId"
  Subject |o--o{ AttendanceSession : "subjectId"
  Subject ||--o{ ClassSubjectPlan : "subjectId"
  Subject ||--o{ TimetableSlot : "subjectId"
  Teacher ||--o{ AttendanceSession : "teacherId"
  Teacher |o--o{ Class : "classTeacherId"
  Teacher ||--o{ StaffAbsence : "teacherId"
  Teacher ||--o{ Substitution : "subTeacherId"
  Teacher ||--o{ TimetableSlot : "teacherId"
  Timetable ||--o{ TimetableSlot : "timetableId"
  User |o--o{ AILog : "actorId"
  User |o--o{ AuditLog : "actorId"
  User ||--o{ KnowledgeItem : "createdBy"
  User |o--o{ Notification : "userId"
  User ||--o| Parent : "userId"
  User ||--o{ PushDevice : "userId"
  User |o--o| Student : "userId"
  User ||--o| Teacher : "userId"
```
