# Expected output: Show actual table relationships

SQL: [04_foreign_keys.sql](04_foreign_keys.sql)

Data: Existing schema.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (15 rows)

| table_name | constraint_name | definition |
| --- | --- | --- |
| Fee | Fee_schoolId_fkey | FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| Fee | Fee_studentId_fkey | FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| KnowledgeItem | KnowledgeItem_createdBy_fkey | FOREIGN KEY ("createdBy") REFERENCES "User"(id) |
| KnowledgeItem | KnowledgeItem_schoolId_fkey | FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON DELETE CASCADE |
| Payment | Payment_feeId_fkey | FOREIGN KEY ("feeId") REFERENCES "Fee"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| Student | Student_classId_fkey | FOREIGN KEY ("classId") REFERENCES "Class"(id) ON UPDATE CASCADE ON DELETE SET NULL |
| Student | Student_schoolId_fkey | FOREIGN KEY ("schoolId") REFERENCES "School"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| Student | Student_userId_fkey | FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL |
| StudentParent | StudentParent_parentId_fkey | FOREIGN KEY ("parentId") REFERENCES "Parent"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| StudentParent | StudentParent_studentId_fkey | FOREIGN KEY ("studentId") REFERENCES "Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| TimetableSlot | TimetableSlot_classId_fkey | FOREIGN KEY ("classId") REFERENCES "Class"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| TimetableSlot | TimetableSlot_roomId_fkey | FOREIGN KEY ("roomId") REFERENCES "Room"(id) ON UPDATE CASCADE ON DELETE SET NULL |
| TimetableSlot | TimetableSlot_subjectId_fkey | FOREIGN KEY ("subjectId") REFERENCES "Subject"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| TimetableSlot | TimetableSlot_teacherId_fkey | FOREIGN KEY ("teacherId") REFERENCES "Teacher"(id) ON UPDATE CASCADE ON DELETE RESTRICT |
| TimetableSlot | TimetableSlot_timetableId_fkey | FOREIGN KEY ("timetableId") REFERENCES "Timetable"(id) ON UPDATE CASCADE ON DELETE CASCADE |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
