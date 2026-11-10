ALTER TABLE "AttendanceSession" DROP CONSTRAINT "AttendanceSession_verificationMode_check";
ALTER TABLE "AttendanceSession" ALTER COLUMN "verificationMode" SET DEFAULT 'QR_FACE';
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_verificationMode_check"
CHECK ("verificationMode" IN ('QR_FACE', 'QR_ONLY', 'FACE_REQUIRED'));

-- End legacy live windows without changing their completed attendance history.
WITH closed AS (
  UPDATE "AttendanceSession" SET "status" = 'CLOSED', "closedAt" = COALESCE("closedAt", CURRENT_TIMESTAMP)
  WHERE "status" = 'ACTIVE' AND "verificationMode" <> 'QR_FACE' RETURNING "id"
)
UPDATE "AttendanceVerification" SET
  "state" = CASE WHEN "qrVerifiedAt" IS NULL THEN 'ABSENT' ELSE 'UNVERIFIED_QR' END,
  "reason" = 'Session closed when mandatory QR + face verification was enabled'
WHERE "sessionId" IN (SELECT "id" FROM closed) AND "state" IN ('PENDING', 'QR_VERIFIED', 'FACE_VERIFIED');

ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_active_requires_dual"
CHECK ("status" <> 'ACTIVE' OR "verificationMode" = 'QR_FACE');

-- Historical single-factor marks are preserved. Every new/updated Present
-- verification must carry both proofs; NOT VALID avoids rewriting history.
ALTER TABLE "AttendanceVerification" ADD CONSTRAINT "AttendanceVerification_present_requires_both"
CHECK ("state" <> 'PRESENT' OR (
  "qrVerifiedAt" IS NOT NULL AND "faceVerifiedAt" IS NOT NULL AND "markedPresentAt" IS NOT NULL
  AND "qrVerifiedAt" <= "markedPresentAt" AND "faceVerifiedAt" <= "markedPresentAt"
  AND "faceConfidence" IS NOT NULL AND "threshold" IS NOT NULL
  AND "threshold" > 0 AND "threshold" <= 1
  AND "faceConfidence" >= "threshold" AND "faceConfidence" <= 1
)) NOT VALID;
