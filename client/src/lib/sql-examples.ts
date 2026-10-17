export const SQL_EXAMPLES = [
  { title: 'Meet the students', category: 'Read', description: 'SELECT · ORDER BY · LIMIT', sql: `-- Explore the fictional school. Quoted names are case-sensitive.
SELECT "admissionNo", "name", "classId", "active"
FROM "Student"
ORDER BY "name"
LIMIT 20;` },
  { title: 'Class fee leaderboard', category: 'Read', description: 'JOIN · GROUP BY · HAVING', sql: `SELECT c."name" AS class,
       COUNT(DISTINCT s."id") AS students,
       SUM(f."amount" - f."paid") AS outstanding
FROM "Class" c
JOIN "Student" s ON s."classId" = c."id"
JOIN "Fee" f ON f."studentId" = s."id"
GROUP BY c."id", c."name"
HAVING SUM(f."amount" - f."paid") > 0
ORDER BY outstanding DESC;` },
  { title: 'Above the average', category: 'Read', description: 'Nested subquery', sql: `SELECT "title", "amount", "paid"
FROM "Fee"
WHERE "amount" > (SELECT AVG("amount") FROM "Fee")
ORDER BY "amount" DESC;` },
  { title: 'Students with unpaid fees', category: 'Read', description: 'Correlated EXISTS', sql: `SELECT s."name", s."admissionNo"
FROM "Student" s
WHERE EXISTS (
  SELECT 1 FROM "Fee" f
  WHERE f."studentId" = s."id" AND f."paid" < f."amount"
)
ORDER BY s."name";` },
  { title: 'Add a student', category: 'Write', description: 'INSERT · RETURNING', sql: `INSERT INTO "Student"
  ("id", "schoolId", "admissionNo", "rollNo", "name", "classId", "updatedAt")
VALUES
  ('demo-student', 'lab-school', 'LAB-NEW', 99, 'Alex Demo', 'class-1', NOW())
RETURNING "id", "name", "admissionNo";

SELECT COUNT(*) AS students_now FROM "Student";` },
  { title: 'Update a student', category: 'Write', description: 'UPDATE · WHERE · RETURNING', sql: `-- Run "Add a student" first.
UPDATE "Student"
SET "name" = 'Alex Updated', "updatedAt" = NOW()
WHERE "id" = 'demo-student'
RETURNING "id", "name";` },
  { title: 'Delete the demo student', category: 'Write', description: 'DELETE · RETURNING', sql: `-- Removes only the row added by the INSERT example.
DELETE FROM "Student"
WHERE "id" = 'demo-student'
RETURNING "id", "name";

SELECT COUNT(*) AS students_now FROM "Student";` },
  { title: 'A transaction you can undo', category: 'Advanced', description: 'BEGIN · UPDATE · ROLLBACK', sql: `BEGIN;
UPDATE "Fee" SET "paid" = "amount", "status" = 'PAID'
WHERE "id" = 'fee-2';
SELECT "id", "paid", "status" FROM "Fee" WHERE "id" = 'fee-2';
ROLLBACK;
SELECT "id", "paid", "status" FROM "Fee" WHERE "id" = 'fee-2';` },
  { title: 'Seven days of attendance', category: 'Advanced', description: 'Recursive CTE · LEFT JOIN', sql: `WITH RECURSIVE days(day) AS (
  SELECT CURRENT_DATE - 6
  UNION ALL
  SELECT day + 1 FROM days WHERE day < CURRENT_DATE
)
SELECT d.day::text,
       COUNT(a."id") AS records,
       COUNT(*) FILTER (WHERE a."status" = 'PRESENT') AS present
FROM days d
LEFT JOIN "Attendance" a ON a."date" = d.day::text
GROUP BY d.day
ORDER BY d.day;` },
  { title: 'Call a payment function', category: 'Advanced', description: 'PL/pgSQL function · constraints', sql: `-- Calls the same database function defined by Meridian's SQL scripts.
SELECT * FROM record_fee_payment(
  'fee-2', 'lab-school', 100.00,
  'lab-payment-' || MD5(RANDOM()::text), 'CASH', 'Classroom demo'
);
SELECT "id", "amount", "paid", "status" FROM "Fee" WHERE "id" = 'fee-2';` },
  { title: 'Build a table and trigger', category: 'Advanced', description: 'DDL · function · trigger', sql: `CREATE TABLE IF NOT EXISTS "LabNotes" (
  id SERIAL PRIMARY KEY,
  note TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION lab_touch() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS touch_note ON "LabNotes";
CREATE TRIGGER touch_note BEFORE UPDATE ON "LabNotes"
FOR EACH ROW EXECUTE FUNCTION lab_touch();
INSERT INTO "LabNotes" (note) VALUES ('Hello, PostgreSQL!') RETURNING *;
UPDATE "LabNotes" SET note = 'The trigger ran.' RETURNING *;` },
  { title: 'Vector similarity search', category: 'Vector', description: 'pgvector · cosine distance', sql: `-- Illustrative unit vectors, not model-generated semantic embeddings.
SELECT "title", "category",
       ROUND((1 - ("embedding" <=> (
         SELECT "embedding" FROM "KnowledgeItem" WHERE "id" = 'policy-1'
       )))::numeric, 3) AS similarity
FROM "KnowledgeItem"
ORDER BY similarity DESC;` },
] as const;
