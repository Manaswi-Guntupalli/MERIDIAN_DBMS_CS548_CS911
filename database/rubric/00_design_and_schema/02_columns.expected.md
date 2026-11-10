# Expected output: Inspect important table columns

SQL: [02_columns.sql](02_columns.sql)

Data: Existing schema.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (45 rows)

| table_name | column_name | data_type | is_nullable |
| --- | --- | --- | --- |
| Fee | id | text | NO |
| Fee | schoolId | text | NO |
| Fee | studentId | text | NO |
| Fee | title | text | NO |
| Fee | amount | numeric(12,2) | NO |
| Fee | paid | numeric(12,2) | NO |
| Fee | dueDate | text | NO |
| Fee | status | text | NO |
| Fee | createdAt | timestamp(3) without time zone | NO |
| KnowledgeItem | id | text | NO |
| KnowledgeItem | schoolId | text | NO |
| KnowledgeItem | title | text | NO |
| KnowledgeItem | content | text | NO |
| KnowledgeItem | category | text | NO |
| KnowledgeItem | sourceId | text | YES |
| KnowledgeItem | createdBy | text | NO |
| KnowledgeItem | model | text | NO |
| KnowledgeItem | embedding | vector(384) | NO |
| KnowledgeItem | revision | integer | NO |
| KnowledgeItem | createdAt | timestamp with time zone | NO |
| KnowledgeItem | updatedAt | timestamp with time zone | NO |
| Student | id | text | NO |
| Student | schoolId | text | NO |
| Student | userId | text | YES |
| Student | admissionNo | text | NO |
| Student | rollNo | integer | NO |
| Student | name | text | NO |
| Student | gender | text | YES |
| Student | dob | timestamp(3) without time zone | YES |
| Student | bloodGroup | text | YES |
| Student | photoUrl | text | YES |
| Student | email | text | YES |
| Student | phone | text | YES |
| Student | address | text | YES |
| Student | pincode | text | YES |
| Student | guardianName | text | YES |
| Student | fatherName | text | YES |
| Student | motherName | text | YES |
| Student | emergencyContact | text | YES |
| Student | classId | text | YES |
| Student | active | boolean | NO |
| Student | faceEnrolled | boolean | NO |
| Student | faceCount | integer | NO |
| Student | createdAt | timestamp(3) without time zone | NO |
| Student | updatedAt | timestamp(3) without time zone | NO |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
