-- Create six demo fees for existing students
-- Concepts: INSERT SELECT; JOIN; ORDER BY
-- Data: Six demo Fee rows related to real students; rolled back
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 06_insert_select.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
INSERT INTO public."Fee" (id,"schoolId","studentId",title,amount,paid,"dueDate",status)
SELECT 'rubric_demo_bulk_'||s."admissionNo",s."schoolId",s.id,'Rubric field trip',150.00,0.00,'2026-12-01','PENDING'
FROM public."Student" s WHERE s."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') ORDER BY s."admissionNo",s.id LIMIT 6;
SELECT s."admissionNo",s.name,f.title,f.amount,f.paid FROM public."Fee" f JOIN public."Student" s ON s.id=f."studentId"
WHERE f.id LIKE 'rubric_demo_bulk_%' ORDER BY s."admissionNo";

ROLLBACK;
