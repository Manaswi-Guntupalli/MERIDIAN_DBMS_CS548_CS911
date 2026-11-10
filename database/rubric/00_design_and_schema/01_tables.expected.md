# Expected output: List all actual application tables

SQL: [01_tables.sql](01_tables.sql)

Data: Existing schema.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (43 rows)

| table_name |
| --- |
| AILog |
| AcademicConfig |
| Attendance |
| AttendanceEvent |
| AttendanceSession |
| AttendanceVerification |
| AuditLog |
| Building |
| Class |
| ClassSubjectPlan |
| Document |
| DocumentActivity |
| DocumentInsight |
| DocumentPage |
| EmergencyAck |
| EmergencyEvent |
| EmergencyIncident |
| Event |
| ExtractedField |
| FaceEmbedding |
| FaceEnrollment |
| FaceEvent |
| Fee |
| KnowledgeItem |
| KnowledgeRevision |
| Notification |
| NotificationRead |
| Parent |
| Payment |
| Prediction |
| PushDevice |
| Room |
| School |
| Setting |
| StaffAbsence |
| Student |
| StudentParent |
| Subject |
| Substitution |
| Teacher |
| Timetable |
| TimetableSlot |
| User |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
