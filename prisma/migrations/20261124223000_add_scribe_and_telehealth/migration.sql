CREATE TYPE "AppointmentKind" AS ENUM ('IN_PERSON', 'TELEHEALTH');
CREATE TYPE "TelehealthStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'ENDED', 'CANCELLED');
CREATE TYPE "RecordingStatus" AS ENUM ('NOT_REQUESTED', 'CONSENT_PENDING', 'RECORDING', 'STOPPED', 'FAILED');
CREATE TYPE "ScribeStatus" AS ENUM ('DRAFT', 'GENERATED', 'REVIEWED', 'APPLIED', 'CANCELLED');

ALTER TABLE "Appointment" ADD COLUMN "kind" "AppointmentKind" NOT NULL DEFAULT 'IN_PERSON';

CREATE TABLE "TelehealthSession" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "status" "TelehealthStatus" NOT NULL DEFAULT 'WAITING',
    "patientConsentAt" TIMESTAMP(3),
    "recordingStatus" "RecordingStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "recordingConsentAt" TIMESTAMP(3),
    "recordingStartedAt" TIMESTAMP(3),
    "recordingEndedAt" TIMESTAMP(3),
    "recordingUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelehealthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelehealthSignal" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelehealthSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScribeSession" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "encounterId" TEXT,
    "status" "ScribeStatus" NOT NULL DEFAULT 'DRAFT',
    "transcript" TEXT NOT NULL,
    "draftSubjective" TEXT,
    "draftObjective" TEXT,
    "draftAssessment" TEXT,
    "draftPlan" TEXT,
    "draftDiagnosis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScribeSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodingSuggestion" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "scribeSessionId" TEXT,
    "system" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "accepted" BOOLEAN,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodingSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelehealthSession_appointmentId_key" ON "TelehealthSession"("appointmentId");
CREATE INDEX "TelehealthSession_practiceId_status_idx" ON "TelehealthSession"("practiceId", "status");
CREATE INDEX "TelehealthSignal_sessionId_targetId_createdAt_idx" ON "TelehealthSignal"("sessionId", "targetId", "createdAt");
CREATE INDEX "ScribeSession_practiceId_patientId_practitionerId_createdAt_idx" ON "ScribeSession"("practiceId", "patientId", "practitionerId", "createdAt");
CREATE INDEX "CodingSuggestion_practiceId_patientId_scribeSessionId_idx" ON "CodingSuggestion"("practiceId", "patientId", "scribeSessionId");

ALTER TABLE "TelehealthSession" ADD CONSTRAINT "TelehealthSession_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelehealthSession" ADD CONSTRAINT "TelehealthSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelehealthSession" ADD CONSTRAINT "TelehealthSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelehealthSession" ADD CONSTRAINT "TelehealthSession_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelehealthSignal" ADD CONSTRAINT "TelehealthSignal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TelehealthSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScribeSession" ADD CONSTRAINT "ScribeSession_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScribeSession" ADD CONSTRAINT "ScribeSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScribeSession" ADD CONSTRAINT "ScribeSession_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScribeSession" ADD CONSTRAINT "ScribeSession_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodingSuggestion" ADD CONSTRAINT "CodingSuggestion_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingSuggestion" ADD CONSTRAINT "CodingSuggestion_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingSuggestion" ADD CONSTRAINT "CodingSuggestion_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingSuggestion" ADD CONSTRAINT "CodingSuggestion_scribeSessionId_fkey" FOREIGN KEY ("scribeSessionId") REFERENCES "ScribeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
