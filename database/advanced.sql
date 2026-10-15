-- Applied after the Prisma relational migration, in a single transaction.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "KnowledgeItem" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL REFERENCES "School"("id") ON DELETE CASCADE,
  "title" TEXT NOT NULL CHECK (length(trim("title")) BETWEEN 1 AND 180),
  "content" TEXT NOT NULL CHECK (length(trim("content")) BETWEEN 20 AND 12000),
  "category" TEXT NOT NULL CHECK ("category" IN ('POLICY','NOTICE','DOCUMENT')),
  "sourceId" TEXT,
  "createdBy" TEXT NOT NULL REFERENCES "User"("id"),
  "model" TEXT NOT NULL DEFAULT 'Xenova/all-MiniLM-L6-v2' CHECK ("model" = 'Xenova/all-MiniLM-L6-v2'),
  "embedding" vector(384) NOT NULL CHECK (vector_norm("embedding") > 0),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_school_category ON "KnowledgeItem"("schoolId", "category");
CREATE INDEX IF NOT EXISTS knowledge_embedding_hnsw ON "KnowledgeItem" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS knowledge_fulltext ON "KnowledgeItem" USING gin (to_tsvector('english', "title" || ' ' || "content"));

-- DB roles are deliberately NOLOGIN: the API switches role only inside a transaction.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'meridian_knowledge') THEN
    CREATE ROLE meridian_knowledge NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
GRANT meridian_knowledge TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO meridian_knowledge;
GRANT SELECT, INSERT, UPDATE, DELETE ON "KnowledgeItem" TO meridian_knowledge;

CREATE OR REPLACE FUNCTION meridian_actor_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT "role" FROM public."User"
  WHERE "id" = current_setting('meridian.user_id', true)
    AND "schoolId" = current_setting('meridian.school_id', true)
    AND "active" = true AND "mustChangePassword" = false
$$;
REVOKE ALL ON FUNCTION meridian_actor_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION meridian_actor_role() TO meridian_knowledge;
ALTER TABLE "KnowledgeItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_read ON "KnowledgeItem";
CREATE POLICY knowledge_read ON "KnowledgeItem" FOR SELECT TO meridian_knowledge
USING ("schoolId" = current_setting('meridian.school_id', true)
  AND meridian_actor_role() IN ('SUPER_ADMIN','ADMIN','PRINCIPAL','TEACHER'));
DROP POLICY IF EXISTS knowledge_create ON "KnowledgeItem";
CREATE POLICY knowledge_create ON "KnowledgeItem" FOR INSERT TO meridian_knowledge
WITH CHECK ("schoolId" = current_setting('meridian.school_id', true)
  AND "createdBy" = current_setting('meridian.user_id', true)
  AND meridian_actor_role() IN ('SUPER_ADMIN','ADMIN','PRINCIPAL'));
DROP POLICY IF EXISTS knowledge_update ON "KnowledgeItem";
CREATE POLICY knowledge_update ON "KnowledgeItem" FOR UPDATE TO meridian_knowledge
USING ("schoolId" = current_setting('meridian.school_id', true)
  AND meridian_actor_role() IN ('SUPER_ADMIN','ADMIN','PRINCIPAL'))
WITH CHECK ("schoolId" = current_setting('meridian.school_id', true)
  AND meridian_actor_role() IN ('SUPER_ADMIN','ADMIN','PRINCIPAL'));
DROP POLICY IF EXISTS knowledge_delete ON "KnowledgeItem";
CREATE POLICY knowledge_delete ON "KnowledgeItem" FOR DELETE TO meridian_knowledge
USING ("schoolId" = current_setting('meridian.school_id', true)
  AND meridian_actor_role() IN ('SUPER_ADMIN','ADMIN','PRINCIPAL'));

CREATE TABLE IF NOT EXISTS "KnowledgeRevision" (
  "id" BIGSERIAL PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "actorId" TEXT,
  "revision" INTEGER NOT NULL,
  "changedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION knowledge_audit_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW."updatedAt" := now();
    NEW."revision" := OLD."revision" + 1;
    NEW."createdBy" := OLD."createdBy";
    NEW."schoolId" := OLD."schoolId";
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public."KnowledgeRevision"("itemId","schoolId","operation","actorId","revision")
    VALUES (OLD."id", OLD."schoolId", TG_OP, current_setting('meridian.user_id',true), OLD."revision");
    RETURN OLD;
  END IF;
  INSERT INTO public."KnowledgeRevision"("itemId","schoolId","operation","actorId","revision")
  VALUES (NEW."id", NEW."schoolId", TG_OP, current_setting('meridian.user_id',true), NEW."revision");
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS knowledge_audit ON "KnowledgeItem";
CREATE TRIGGER knowledge_audit BEFORE INSERT OR UPDATE OR DELETE ON "KnowledgeItem"
FOR EACH ROW EXECUTE FUNCTION knowledge_audit_change();

-- Database integrity holds even for writes outside Express/Prisma.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname='fee_balance_check') THEN
    ALTER TABLE "Fee" ADD CONSTRAINT fee_balance_check CHECK ("amount" > 0 AND "paid" >= 0 AND "paid" <= "amount");
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname='payment_positive_check') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT payment_positive_check CHECK ("amount" > 0);
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname='user_role_check') THEN
    ALTER TABLE "User" ADD CONSTRAINT user_role_check CHECK ("role" IN ('SUPER_ADMIN','ADMIN','PRINCIPAL','TEACHER','STUDENT','PARENT'));
  END IF;
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname='attendance_status_check') THEN
    ALTER TABLE "Attendance" ADD CONSTRAINT attendance_status_check CHECK ("status" IN ('PRESENT','ABSENT','LATE','LEAVE'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS fee_school_due ON "Fee"("schoolId","dueDate");
CREATE UNIQUE INDEX IF NOT EXISTS one_live_timetable ON "Timetable"("schoolId") WHERE "active" AND "status"='PUBLISHED';

CREATE OR REPLACE VIEW school_fee_summary AS
SELECT "schoolId", count(*)::integer AS accounts, sum("amount") AS billed,
       sum("paid") AS collected, sum("amount"-"paid") AS outstanding
FROM "Fee" GROUP BY "schoolId";

-- Serializable business operation: FOR UPDATE serializes payers of the same fee.
CREATE OR REPLACE FUNCTION record_fee_payment(p_fee text, p_school text, p_amount double precision,
  p_method text, p_reference text, p_id text)
RETURNS TABLE("paymentId" text, "paid" double precision, "status" text)
LANGUAGE plpgsql AS $$
DECLARE f "Fee"%ROWTYPE; new_paid double precision; new_status text;
BEGIN
  SELECT * INTO f FROM "Fee" WHERE "id"=p_fee AND "schoolId"=p_school FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fee not found'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > f."amount" - f."paid" THEN
    RAISE EXCEPTION 'Invalid payment or amount exceeds outstanding balance';
  END IF;
  new_paid := f."paid" + p_amount;
  new_status := CASE WHEN new_paid >= f."amount" THEN 'PAID' ELSE 'PARTIAL' END;
  INSERT INTO "Payment"("id","feeId","amount","method","reference","paidAt")
  VALUES(p_id,p_fee,p_amount,coalesce(p_method,'CASH'),p_reference,now());
  UPDATE "Fee" SET "paid"=new_paid,"status"=new_status WHERE "id"=p_fee;
  RETURN QUERY SELECT p_id,new_paid,new_status;
END $$;
REVOKE ALL ON FUNCTION record_fee_payment(text,text,double precision,text,text,text) FROM PUBLIC;

-- School consistency across foreign keys (a valid ID from another school is invalid).
CREATE OR REPLACE FUNCTION enforce_school_reference() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE referenced_school text; referenced_id text;
BEGIN
  referenced_id := to_jsonb(NEW)->>TG_ARGV[0];
  IF referenced_id IS NULL THEN RETURN NEW; END IF;
  EXECUTE format('SELECT "schoolId" FROM %I WHERE "id"=$1', TG_ARGV[1]) INTO referenced_school USING referenced_id;
  IF referenced_school IS DISTINCT FROM NEW."schoolId" THEN
    RAISE EXCEPTION 'Cross-school reference rejected: %.%', TG_TABLE_NAME, TG_ARGV[0];
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS fee_student_school ON "Fee";
CREATE TRIGGER fee_student_school BEFORE INSERT OR UPDATE ON "Fee" FOR EACH ROW EXECUTE FUNCTION enforce_school_reference('studentId','Student');
DROP TRIGGER IF EXISTS student_class_school ON "Student";
CREATE TRIGGER student_class_school BEFORE INSERT OR UPDATE ON "Student" FOR EACH ROW EXECUTE FUNCTION enforce_school_reference('classId','Class');
DROP TRIGGER IF EXISTS attendance_student_school ON "Attendance";
CREATE TRIGGER attendance_student_school BEFORE INSERT OR UPDATE ON "Attendance" FOR EACH ROW EXECUTE FUNCTION enforce_school_reference('studentId','Student');
DROP TRIGGER IF EXISTS attendance_class_school ON "Attendance";
CREATE TRIGGER attendance_class_school BEFORE INSERT OR UPDATE ON "Attendance" FOR EACH ROW EXECUTE FUNCTION enforce_school_reference('classId','Class');
