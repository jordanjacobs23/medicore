CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedByIp" TEXT,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

CREATE TYPE "BreakGlassStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED');

CREATE TABLE "BreakGlassRequest" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requesterStaffId" TEXT NOT NULL,
    "reviewerStaffId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "BreakGlassStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakGlassRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientConsent_practiceId_patientId_noticeVersion_key" ON "PatientConsent"("practiceId", "patientId", "noticeVersion");
CREATE INDEX "PatientConsent_patientId_acceptedAt_idx" ON "PatientConsent"("patientId", "acceptedAt");
CREATE INDEX "BreakGlassRequest_practiceId_status_createdAt_idx" ON "BreakGlassRequest"("practiceId", "status", "createdAt");
CREATE INDEX "BreakGlassRequest_requesterStaffId_patientId_status_idx" ON "BreakGlassRequest"("requesterStaffId", "patientId", "status");

ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreakGlassRequest" ADD CONSTRAINT "BreakGlassRequest_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BreakGlassRequest" ADD CONSTRAINT "BreakGlassRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreakGlassRequest" ADD CONSTRAINT "BreakGlassRequest_requesterStaffId_fkey" FOREIGN KEY ("requesterStaffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BreakGlassRequest" ADD CONSTRAINT "BreakGlassRequest_reviewerStaffId_fkey" FOREIGN KEY ("reviewerStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
