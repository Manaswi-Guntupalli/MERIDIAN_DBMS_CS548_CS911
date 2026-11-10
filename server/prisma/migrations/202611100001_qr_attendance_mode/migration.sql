ALTER TABLE "AttendanceSession"
ADD COLUMN "verificationMode" TEXT NOT NULL DEFAULT 'FACE_REQUIRED';

ALTER TABLE "AttendanceSession"
ADD CONSTRAINT "AttendanceSession_verificationMode_check"
CHECK ("verificationMode" IN ('QR_ONLY', 'FACE_REQUIRED'));
