-- Fictional records only. IDs are intentionally readable for classroom SQL.
INSERT INTO "School" ("id","name","code","updatedAt")
VALUES ('lab-school','Meridian Demonstration School','SQL-LAB',now());
INSERT INTO "User" ("id","schoolId","email","password","name","role","updatedAt") VALUES
('lab-admin','lab-school','principal@example.test','NOT-A-LOGIN','Dr. Mira Sen','PRINCIPAL',now()),
('lab-teacher-1','lab-school','asha@example.test','NOT-A-LOGIN','Asha Rao','TEACHER',now()),
('lab-teacher-2','lab-school','dev@example.test','NOT-A-LOGIN','Dev Mehta','TEACHER',now());
INSERT INTO "Teacher" ("id","schoolId","userId","employeeId","department","weeklyHours","updatedAt") VALUES
('teacher-1','lab-school','lab-teacher-1','T001','Science',22,now()),
('teacher-2','lab-school','lab-teacher-2','T002','Mathematics',18,now());
INSERT INTO "Class" ("id","schoolId","grade","section","name","classTeacherId") VALUES
('class-1','lab-school',8,'A','8A','teacher-1'),
('class-2','lab-school',9,'A','9A','teacher-2'),
('class-3','lab-school',10,'B','10B',null);
INSERT INTO "Student" ("id","schoolId","admissionNo","rollNo","name","classId","updatedAt")
SELECT 'student-'||i, 'lab-school', 'LAB-'||lpad(i::text,3,'0'), i,
  (ARRAY['Aarav Shah','Isha Patel','Rohan Das','Ananya Roy','Kabir Rao','Meera Nair','Vihaan Sen','Tara Joshi'])[i],
  'class-'||((i-1)%3+1), now() FROM generate_series(1,8) i;
INSERT INTO "Fee" ("id","schoolId","studentId","title","amount","paid","dueDate","status")
SELECT 'fee-'||i,'lab-school','student-'||i,'Term 1 tuition',12000+i*500,
  CASE WHEN i%3=0 THEN 12000+i*500 WHEN i%3=1 THEN 6000 ELSE 0 END,
  (current_date+14)::text, CASE WHEN i%3=0 THEN 'PAID' WHEN i%3=1 THEN 'PARTIAL' ELSE 'PENDING' END
FROM generate_series(1,8) i;
INSERT INTO "Attendance" ("id","schoolId","studentId","classId","date","status","markedById")
SELECT 'att-'||s."id"||'-'||d,'lab-school',s."id",s."classId",(current_date-d)::text,
  CASE WHEN (s."rollNo"+d)%5=0 THEN 'ABSENT' ELSE 'PRESENT' END,'lab-admin'
FROM "Student" s CROSS JOIN generate_series(0,6) d;
-- Small illustrative vectors demonstrate cosine distance; these are not ML embeddings.
INSERT INTO "KnowledgeItem" ("id","schoolId","title","content","category","createdBy","embedding") VALUES
('policy-1','lab-school','Attendance policy','Students should attend every scheduled school day.','POLICY','lab-admin',
  ('[1,'||array_to_string(array_fill(0,ARRAY[383]),',')||']')::vector),
('policy-2','lab-school','Fee payment policy','Term fees are payable before the published due date.','POLICY','lab-admin',
  ('[0,1,'||array_to_string(array_fill(0,ARRAY[382]),',')||']')::vector);
