# Expected output: Show actual validation rules

SQL: [05_check_constraints.sql](05_check_constraints.sql)

Data: Existing schema.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (15 rows)

| table_name | constraint_name | validated_for_historical_rows | definition |
| --- | --- | --- | --- |
| AttendanceSession | AttendanceSession_active_requires_dual | true | CHECK (((status <> 'ACTIVE'::text) OR ("verificationMode" = 'QR_FACE'::text))) |
| AttendanceSession | AttendanceSession_date_calendar | true | CHECK (valid_calendar_date(date)) |
| AttendanceSession | AttendanceSession_verificationMode_check | true | CHECK (("verificationMode" = ANY (ARRAY['QR_FACE'::text, 'QR_ONLY'::text, 'FACE_REQUIRED'::text]))) |
| AttendanceVerification | AttendanceVerification_present_requires_both | false | CHECK (((state <> 'PRESENT'::text) OR (("qrVerifiedAt" IS NOT NULL) AND ("faceVerifiedAt" IS NOT NULL) AND ("markedPresentAt" IS NOT NULL) AND ("qrVerifiedAt" <= "markedPresentAt") AND ("faceVerifiedAt" <= "markedPresentAt") AND ("faceConfidence" IS NOT NULL) AND (threshold IS NOT NULL) AND (threshold > (0)::double precision) AND (threshold <= (1)::double precision) AND ("faceConfidence" >= threshold) AND ("faceConfidence" <= (1)::double precision)))) NOT VALID |
| Fee | Fee_dueDate_calendar | true | CHECK (valid_calendar_date("dueDate")) |
| Fee | fee_balance_check | true | CHECK (((amount > (0)::numeric) AND (paid >= (0)::numeric) AND (paid <= amount))) |
| KnowledgeItem | KnowledgeItem_category_check | true | CHECK ((category = ANY (ARRAY['POLICY'::text, 'NOTICE'::text, 'DOCUMENT'::text]))) |
| KnowledgeItem | KnowledgeItem_content_check | true | CHECK (((length(TRIM(BOTH FROM content)) >= 20) AND (length(TRIM(BOTH FROM content)) <= 12000))) |
| KnowledgeItem | KnowledgeItem_embedding_check | true | CHECK ((vector_norm(embedding) > (0)::double precision)) |
| KnowledgeItem | KnowledgeItem_model_check | true | CHECK ((model = 'Xenova/all-MiniLM-L6-v2'::text)) |
| KnowledgeItem | KnowledgeItem_revision_check | true | CHECK ((revision > 0)) |
| KnowledgeItem | KnowledgeItem_title_check | true | CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 180))) |
| Payment | payment_positive_check | true | CHECK ((amount > (0)::numeric)) |
| Student | student_positive_roll | true | CHECK ((("rollNo" > 0) AND (length(TRIM(BOTH FROM "admissionNo")) > 0))) |
| User | user_role_check | true | CHECK ((role = ANY (ARRAY['SUPER_ADMIN'::text, 'ADMIN'::text, 'PRINCIPAL'::text, 'TEACHER'::text, 'STUDENT'::text, 'PARENT'::text]))) |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
