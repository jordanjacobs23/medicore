CREATE TYPE "PatientConsentPurpose" AS ENUM (
    'AI_SCRIBE',
    'TELEHEALTH',
    'RECORDING',
    'MARKETING',
    'THIRD_PARTY_SHARE'
);

CREATE TABLE "PatientPurposeConsent" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "purpose" "PatientConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "scopeText" TEXT NOT NULL,
    "scopeVersion" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "sequence" SERIAL NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientPurposeConsent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PatientPurposeConsent_sequence_key" UNIQUE ("sequence")
);

CREATE INDEX "PatientPurposeConsent_practiceId_patientId_purpose_recordedAt_idx"
    ON "PatientPurposeConsent"("practiceId", "patientId", "purpose", "recordedAt");

ALTER TABLE "PatientPurposeConsent"
    ADD CONSTRAINT "PatientPurposeConsent_practiceId_fkey"
    FOREIGN KEY ("practiceId") REFERENCES "Practice"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PatientPurposeConsent"
    ADD CONSTRAINT "PatientPurposeConsent_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
