-- Read the published 7A timetable with teachers and rooms
-- Concepts: Six-table JOIN; LEFT JOIN; ORDER BY
-- Data: Existing published timetable; first six slots for class 7A
-- Target: actual website PostgreSQL database (MERIDIAN school), not SQL Lab.
-- Run the WHOLE file. It is standalone; no earlier example is required.
-- Result tables: 03_timetable_join.expected.md in this directory.
-- All persistent-table writes and DDL are rolled back.

BEGIN;
SET LOCAL statement_timeout = '20s';
SET LOCAL lock_timeout = '3s';
SET LOCAL TIME ZONE 'UTC';
SELECT c.name AS class_name,sl.day+1 AS weekday_number,sl.period+1 AS period_number,
sub.name AS subject,u.name AS teacher,coalesce(r.name,'Unassigned') AS room
FROM public."Timetable" tt JOIN public."TimetableSlot" sl ON sl."timetableId"=tt.id
JOIN public."Class" c ON c.id=sl."classId" JOIN public."Subject" sub ON sub.id=sl."subjectId"
JOIN public."Teacher" te ON te.id=sl."teacherId" JOIN public."User" u ON u.id=te."userId"
LEFT JOIN public."Room" r ON r.id=sl."roomId"
WHERE tt."schoolId"=(SELECT id FROM public."School" WHERE code = 'MERIDIAN') AND tt.active AND tt.status='PUBLISHED' AND c.name='7A'
ORDER BY sl.day,sl.period,sl.id LIMIT 6;

ROLLBACK;
