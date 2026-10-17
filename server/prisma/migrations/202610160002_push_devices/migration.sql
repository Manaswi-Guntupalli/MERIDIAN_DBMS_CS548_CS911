CREATE TABLE "PushDevice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "schoolId" TEXT NOT NULL REFERENCES "School"("id") ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL CHECK ("platform" IN ('ANDROID','IOS','WEB')),
  "tokenVersion" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "PushDevice_token_key" ON "PushDevice"("token");
CREATE INDEX "PushDevice_schoolId_userId_idx" ON "PushDevice"("schoolId","userId");
