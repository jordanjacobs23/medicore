CREATE TYPE "PatientCorrectionRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'COMPLETED', 'DECLINED');

ALTER TABLE "LabResult" ADD COLUMN "releasedAt" TIMESTAMP(3);

CREATE TABLE "PatientCorrectionRequest" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedFields" TEXT NOT NULL,
    "requestedChanges" TEXT NOT NULL,
    "status" "PatientCorrectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientCorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientCorrectionRequest_practiceId_status_createdAt_idx" ON "PatientCorrectionRequest"("practiceId", "status", "createdAt");
CREATE INDEX "PatientCorrectionRequest_patientId_createdAt_idx" ON "PatientCorrectionRequest"("patientId", "createdAt");

ALTER TABLE "PatientCorrectionRequest" ADD CONSTRAINT "PatientCorrectionRequest_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientCorrectionRequest" ADD CONSTRAINT "PatientCorrectionRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
