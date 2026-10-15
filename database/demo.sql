-- Run in psql after setup/seed. Everything in this demonstration rolls back.
BEGIN;
-- DDL CREATE / ALTER / DROP on an isolated temporary table.
CREATE TEMP TABLE rubric_demo(id integer PRIMARY KEY, value text NOT NULL);
ALTER TABLE rubric_demo ADD COLUMN score integer CHECK(score >= 0);
-- DML INSERT / SELECT / UPDATE / DELETE.
INSERT INTO rubric_demo VALUES(1,'Draft',1);
SELECT * FROM rubric_demo;
UPDATE rubric_demo SET value='Reviewed',score=2 WHERE id=1;
SELECT * FROM rubric_demo;
DELETE FROM rubric_demo WHERE id=1;
DROP TABLE rubric_demo;
-- JOIN + grouping + HAVING + aggregation.
SELECT c."name",count(DISTINCT s."id") AS students,sum(f."amount"-f."paid") AS outstanding
FROM "Class" c JOIN "Student" s ON s."classId"=c."id"
JOIN "Fee" f ON f."studentId"=s."id" AND f."schoolId"=s."schoolId"
GROUP BY c."id",c."name" HAVING sum(f."amount"-f."paid")>0 ORDER BY outstanding DESC;
-- Nested and correlated subqueries (per-school averages).
SELECT f."title",f."amount" FROM "Fee" f
WHERE f."amount">(SELECT avg(x."amount") FROM "Fee" x WHERE x."schoolId"=f."schoolId");
SELECT s."name" FROM "Student" s WHERE EXISTS(
 SELECT 1 FROM "Fee" f WHERE f."studentId"=s."id" AND f."paid"<f."amount");
WITH RECURSIVE days(day) AS (
 SELECT current_date-6 UNION ALL SELECT day+1 FROM days WHERE day<current_date
) SELECT day FROM days;
SELECT * FROM school_fee_summary;
SELECT extname,extversion FROM pg_extension WHERE extname='vector';
SELECT indexname,indexdef FROM pg_indexes WHERE tablename='KnowledgeItem';
SELECT policyname,cmd,qual,with_check FROM pg_policies WHERE tablename='KnowledgeItem';
ROLLBACK;
