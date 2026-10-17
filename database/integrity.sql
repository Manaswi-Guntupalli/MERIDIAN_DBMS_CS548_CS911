-- Installed after advanced.sql. These rules apply to direct SQL as well as API writes.
CREATE OR REPLACE FUNCTION valid_calendar_date(value text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value IS NULL OR value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RETURN false; END IF;
  RETURN to_char(value::date,'YYYY-MM-DD')=value;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

DO $$ DECLARE t text; c text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='student_positive_roll') THEN
    ALTER TABLE "Student" ADD CONSTRAINT student_positive_roll CHECK ("rollNo">0 AND length(trim("admissionNo"))>0);
  END IF;
  FOR t,c IN SELECT * FROM (VALUES ('Attendance','date'),('AttendanceSession','date'),('StaffAbsence','date'),('Fee','dueDate'),('Prediction','targetDate')) AS x(t,c) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname=t||'_'||c||'_calendar') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (valid_calendar_date(%I))',t,t||'_'||c||'_calendar',c);
    END IF;
  END LOOP;
END $$;

-- Resolve tenant ownership of both root entities and children without schoolId.
CREATE OR REPLACE FUNCTION meridian_row_school(tab text, row_data jsonb) RETURNS text
LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public AS $$
DECLARE parent_tab text; parent_col text; parent_row text;
BEGIN
  IF tab='School' THEN RETURN row_data->>'id'; END IF;
  IF row_data ? 'schoolId' THEN RETURN row_data->>'schoolId'; END IF;
  CASE tab
    WHEN 'Room' THEN parent_tab:='Building'; parent_col:='buildingId';
    WHEN 'StudentParent' THEN parent_tab:='Student'; parent_col:='studentId';
    WHEN 'AttendanceVerification' THEN parent_tab:='AttendanceSession'; parent_col:='sessionId';
    WHEN 'Payment' THEN parent_tab:='Fee'; parent_col:='feeId';
    WHEN 'TimetableSlot' THEN parent_tab:='Timetable'; parent_col:='timetableId';
    WHEN 'ClassSubjectPlan' THEN parent_tab:='Class'; parent_col:='classId';
    WHEN 'StaffAbsence' THEN parent_tab:='Teacher'; parent_col:='teacherId';
    WHEN 'Substitution' THEN parent_tab:='StaffAbsence'; parent_col:='absenceId';
    WHEN 'NotificationRead' THEN parent_tab:='Notification'; parent_col:='notificationId';
    WHEN 'EmergencyAck' THEN parent_tab:='EmergencyIncident'; parent_col:='incidentId';
    WHEN 'EmergencyEvent' THEN parent_tab:='EmergencyIncident'; parent_col:='incidentId';
    WHEN 'DocumentActivity' THEN parent_tab:='Document'; parent_col:='documentId';
    WHEN 'DocumentPage' THEN parent_tab:='Document'; parent_col:='documentId';
    WHEN 'DocumentInsight' THEN parent_tab:='Document'; parent_col:='documentId';
    WHEN 'ExtractedField' THEN parent_tab:='Document'; parent_col:='documentId';
    ELSE RETURN NULL;
  END CASE;
  IF parent_tab IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT to_jsonb(tenant_reference_row)::text FROM public.%I tenant_reference_row WHERE "id"=$1',parent_tab) INTO parent_row USING row_data->>parent_col;
  RETURN meridian_row_school(parent_tab,parent_row::jsonb);
END $$;

CREATE OR REPLACE FUNCTION enforce_tenant_graph() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE school text; old_school text; fk record; ref text; target_school text; col text; target text; subject text;
BEGIN
  school:=meridian_row_school(TG_TABLE_NAME,to_jsonb(NEW));
  IF TG_OP='UPDATE' THEN
    old_school:=meridian_row_school(TG_TABLE_NAME,to_jsonb(OLD));
    IF school IS DISTINCT FROM old_school THEN RAISE EXCEPTION 'Tenant ownership is immutable' USING ERRCODE='23514'; END IF;
  END IF;
  FOR fk IN SELECT a.attname AS col, n.relname AS target
    FROM pg_constraint c JOIN pg_class n ON n.oid=c.confrelid
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND c.conrelid=TG_RELID AND array_length(c.conkey,1)=1
  LOOP
    IF to_jsonb(NEW)->>fk.col IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT to_jsonb(tenant_reference_row)::text FROM public.%I tenant_reference_row WHERE "id"=$1',fk.target) INTO ref USING to_jsonb(NEW)->>fk.col;
    target_school:=meridian_row_school(fk.target,ref::jsonb);
    IF target_school IS NOT NULL AND school IS DISTINCT FROM target_school THEN
      RAISE EXCEPTION 'Cross-school reference rejected: %.%',TG_TABLE_NAME,fk.col USING ERRCODE='23514';
    END IF;
  END LOOP;
  -- Snapshot IDs and polymorphic associations also need ownership validation.
  FOR col,target IN SELECT * FROM (VALUES
    ('markedById','User'),('createdBy','User'),('uploadedById','User'),('consentBy','User'),
    ('triggeredById','User'),('resolvedById','User'),('actorId','User'),('proxyClaimedStudentId','Student'),
    ('classId','Class'),('subjectId','Subject'),('verificationId','AttendanceVerification'),('userId','User')) AS links(c,t)
  LOOP
    IF to_jsonb(NEW)->>col IS NULL THEN CONTINUE; END IF;
    EXECUTE format('SELECT to_jsonb(tenant_reference_row)::text FROM public.%I tenant_reference_row WHERE "id"=$1',target) INTO ref USING to_jsonb(NEW)->>col;
    target_school:=meridian_row_school(target,ref::jsonb);
    IF target_school IS NOT NULL AND school IS DISTINCT FROM target_school THEN
      RAISE EXCEPTION 'Cross-school association rejected: %.%',TG_TABLE_NAME,col USING ERRCODE='23514';
    END IF;
  END LOOP;
  IF TG_TABLE_NAME IN ('FaceEnrollment','FaceEmbedding') THEN
    subject:=CASE NEW."subjectType" WHEN 'STUDENT' THEN 'Student' WHEN 'TEACHER' THEN 'Teacher' ELSE NULL END;
    IF subject IS NULL THEN RAISE EXCEPTION 'Invalid biometric subject type' USING ERRCODE='23514'; END IF;
    EXECUTE format('SELECT to_jsonb(tenant_reference_row)::text FROM public.%I tenant_reference_row WHERE "id"=$1',subject) INTO ref USING NEW."subjectId";
    IF ref IS NULL OR meridian_row_school(subject,ref::jsonb) IS DISTINCT FROM school THEN
      RAISE EXCEPTION 'Invalid biometric subject school' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE '\_%' AND tablename NOT IN ('KnowledgeRevision') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tenant_graph ON %I',t.tablename);
    EXECUTE format('CREATE TRIGGER tenant_graph BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_tenant_graph()',t.tablename);
  END LOOP;
END $$;

-- Refuse to bless pre-existing cross-tenant links. No records are deleted or
-- reassigned automatically; an operator must resolve the reported relationship.
DO $$ DECLARE fk record; invalid boolean;
BEGIN
  FOR fk IN SELECT src.relname AS source, dest.relname AS target, a.attname AS col
    FROM pg_constraint c JOIN pg_class src ON src.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=src.relnamespace
    JOIN pg_class dest ON dest.oid=c.confrelid
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND ns.nspname='public' AND array_length(c.conkey,1)=1
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I s JOIN %I d ON s.%I=d.id WHERE meridian_row_school(%L,to_jsonb(s)) IS DISTINCT FROM meridian_row_school(%L,to_jsonb(d)))',fk.source,fk.target,fk.col,fk.source,fk.target) INTO invalid;
    IF invalid THEN RAISE EXCEPTION 'Existing cross-school relationship: %.%; resolve before installing integrity rules',fk.source,fk.col; END IF;
  END LOOP;
END $$;
