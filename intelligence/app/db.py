"""School-scoped, transactionally consistent read-only PostgreSQL access."""
from __future__ import annotations
from contextlib import contextmanager
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import pandas as pd
import psycopg
from .config import DATABASE_URL

def connection_url() -> str:
    if not DATABASE_URL.startswith(("postgresql://", "postgres://")):
        raise ValueError("Set DATABASE_URL or INTELLIGENCE_DATABASE_URL to PostgreSQL")
    parsed = urlsplit(DATABASE_URL)
    # Prisma-only URL options are not libpq connection parameters.
    query = [(k,v) for k,v in parse_qsl(parsed.query) if k not in {"schema","connection_limit","pool_timeout","pgbouncer","statement_cache_size"}]
    return urlunsplit(parsed._replace(query=urlencode(query)))

@contextmanager
def connect():
    with psycopg.connect(connection_url(), prepare_threshold=None, connect_timeout=10) as conn:
        conn.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        yield conn

def frame(conn, query: str, params: tuple=()) -> pd.DataFrame:
    with conn.cursor() as cursor:
        cursor.execute(query, params)
        return pd.DataFrame(cursor.fetchall(), columns=[c.name for c in cursor.description])

def load_school_frames(school_id: str) -> dict[str,pd.DataFrame]:
    queries = {
        "students": 'SELECT "id","name","classId","active","faceEnrolled" FROM "Student" WHERE "schoolId"=%s',
        "classes": 'SELECT "id","grade","section","name","classTeacherId" FROM "Class" WHERE "schoolId"=%s',
        "attendance": 'SELECT "studentId","classId","date","status","source","confidence" FROM "Attendance" WHERE "schoolId"=%s',
        "events": 'SELECT "studentId","sessionId","source","timestamp","direction","verificationStatus","faceConfidence","late","lateMinutes" FROM "AttendanceEvent" WHERE "schoolId"=%s',
        "fees": 'SELECT "id","studentId","title","amount","paid","dueDate","status" FROM "Fee" WHERE "schoolId"=%s',
        "payments": 'SELECT p."feeId",p."amount",p."paidAt" FROM "Payment" p JOIN "Fee" f ON f."id"=p."feeId" WHERE f."schoolId"=%s',
        "teachers": 'SELECT t."id",t."maxHours",t."weeklyHours",t."department",u."name" FROM "Teacher" t JOIN "User" u ON u."id"=t."userId" WHERE t."schoolId"=%s',
        "absences": 'SELECT a."id",a."teacherId",a."date" FROM "StaffAbsence" a JOIN "Teacher" t ON t."id"=a."teacherId" WHERE t."schoolId"=%s',
        "substitutions": 'SELECT s."absenceId",s."accepted" FROM "Substitution" s JOIN "StaffAbsence" a ON a."id"=s."absenceId" JOIN "Teacher" t ON t."id"=a."teacherId" WHERE t."schoolId"=%s',
        "timetable": 'SELECT "id","name","score","healthString","updatedAt" FROM "Timetable" WHERE "schoolId"=%s AND "active"=TRUE',
        "slots": 'SELECT s."day",s."period",s."classId",s."teacherId",s."roomId" FROM "TimetableSlot" s JOIN "Timetable" t ON t."id"=s."timetableId" WHERE t."schoolId"=%s AND t."active"=TRUE',
        "documents": 'SELECT "id","status","overallConfidence","correctionCount","createdAt","updatedAt" FROM "Document" WHERE "schoolId"=%s',
        "doc_fields": 'SELECT f."documentId",f."status",f."confidence",f."required",f."valid" FROM "ExtractedField" f JOIN "Document" d ON d."id"=f."documentId" WHERE d."schoolId"=%s',
        "students_face": 'SELECT "id","faceEnrolled","active" FROM "Student" WHERE "schoolId"=%s',
        "sessions": 'SELECT "id","status","date","startTime","expiryTime","closedAt" FROM "AttendanceSession" WHERE "schoolId"=%s',
    }
    with connect() as conn:
        return {name:frame(conn,query,(school_id,)) for name,query in queries.items()}
