# Expected output: Show installed primary and unique keys

SQL: [03_primary_and_unique_keys.sql](03_primary_and_unique_keys.sql)

Data: Existing schema.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (11 rows)

| table_name | key_name | key_type | definition |
| --- | --- | --- | --- |
| Attendance | Attendance_pkey | PRIMARY KEY | CREATE UNIQUE INDEX "Attendance_pkey" ON public."Attendance" USING btree (id) |
| Attendance | Attendance_studentId_date_key | UNIQUE INDEX | CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON public."Attendance" USING btree ("studentId", date) |
| AttendanceVerification | AttendanceVerification_pkey | PRIMARY KEY | CREATE UNIQUE INDEX "AttendanceVerification_pkey" ON public."AttendanceVerification" USING btree (id) |
| AttendanceVerification | AttendanceVerification_sessionId_studentId_key | UNIQUE INDEX | CREATE UNIQUE INDEX "AttendanceVerification_sessionId_studentId_key" ON public."AttendanceVerification" USING btree ("sessionId", "studentId") |
| Class | Class_pkey | PRIMARY KEY | CREATE UNIQUE INDEX "Class_pkey" ON public."Class" USING btree (id) |
| Class | Class_schoolId_grade_section_key | UNIQUE INDEX | CREATE UNIQUE INDEX "Class_schoolId_grade_section_key" ON public."Class" USING btree ("schoolId", grade, section) |
| Fee | Fee_pkey | PRIMARY KEY | CREATE UNIQUE INDEX "Fee_pkey" ON public."Fee" USING btree (id) |
| KnowledgeItem | KnowledgeItem_pkey | PRIMARY KEY | CREATE UNIQUE INDEX "KnowledgeItem_pkey" ON public."KnowledgeItem" USING btree (id) |
| Student | Student_pkey | PRIMARY KEY | CREATE UNIQUE INDEX "Student_pkey" ON public."Student" USING btree (id) |
| Student | Student_schoolId_admissionNo_key | UNIQUE INDEX | CREATE UNIQUE INDEX "Student_schoolId_admissionNo_key" ON public."Student" USING btree ("schoolId", "admissionNo") |
| Student | Student_userId_key | UNIQUE INDEX | CREATE UNIQUE INDEX "Student_userId_key" ON public."Student" USING btree ("userId") |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
