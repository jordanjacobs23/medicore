-- Extend the patient record with demographics and longitudinal clinical history.

CREATE TYPE "PatientSexAtBirth" AS ENUM ('FEMALE', 'MALE', 'INTERSEX', 'UNKNOWN');
CREATE TYPE "PatientConditionStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'INACTIVE');
CREATE TYPE "AllergySeverity" AS ENUM ('UNKNOWN', 'MILD', 'MODERATE', 'SEVERE');
CREATE TYPE "AllergyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESOLVED', 'ENTERED_IN_ERROR');
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'STOPPED', 'ENTERED_IN_ERROR');
CREATE TYPE "ImmunizationStatus" AS ENUM ('COMPLETED', 'NOT_DONE', 'DECLINED', 'ENTERED_IN_ERROR');
CREATE TYPE "LabResultStatus" AS ENUM ('PRELIMINARY', 'FINAL', 'AMENDED', 'CORRECTED', 'CANCELLED');
CREATE TYPE "VitalSignKind" AS ENUM ('BLOOD_PRESSURE', 'HEART_RATE', 'RESPIRATORY_RATE', 'TEMPERATURE', 'OXYGEN_SATURATION', 'HEIGHT', 'WEIGHT', 'BMI', 'PAIN_SCORE', 'HEAD_CIRCUMFERENCE', 'OTHER');

ALTER TABLE "Patient"
ADD COLUMN "preferredName" TEXT,
ADD COLUMN "dateOfBirth" DATE,
ADD COLUMN "sexAtBirth" "PatientSexAtBirth",
ADD COLUMN "genderIdentity" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "alternatePhone" TEXT,
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "suburb" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "preferredLanguage" TEXT,
ADD COLUMN "emergencyContactName" TEXT,
ADD COLUMN "emergencyContactRelationship" TEXT,
ADD COLUMN "emergencyContactPhone" TEXT;

CREATE TABLE "PatientMedicalAid" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedById" TEXT,
    "schemeName" TEXT NOT NULL,
    "planName" TEXT,
    "membershipNumber" TEXT NOT NULL,
    "dependantCode" TEXT,
    "principalMemberName" TEXT,
    "relationshipToPrincipal" TEXT,
    "preAuthorizationNumber" TEXT,
    "validFrom" DATE,
    "validThrough" DATE,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientMedicalAid_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientCondition" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "recordedById" TEXT,
    "codeSystem" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "status" "PatientConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "onsetDate" DATE,
    "resolvedDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientCondition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "recordedById" TEXT,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity" NOT NULL DEFAULT 'UNKNOWN',
    "status" "AllergyStatus" NOT NULL DEFAULT 'ACTIVE',
    "onsetDate" DATE,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationStatement" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "prescriptionId" TEXT,
    "recordedById" TEXT,
    "medication" TEXT NOT NULL,
    "strength" TEXT,
    "dosage" TEXT,
    "route" TEXT,
    "frequency" TEXT,
    "instructions" TEXT,
    "status" "MedicationStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT,
    "startedAt" DATE,
    "endedAt" DATE,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedicationStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Immunization" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "administeredById" TEXT,
    "vaccine" TEXT NOT NULL,
    "productName" TEXT,
    "manufacturer" TEXT,
    "lotNumber" TEXT,
    "doseNumber" TEXT,
    "route" TEXT,
    "site" TEXT,
    "status" "ImmunizationStatus" NOT NULL DEFAULT 'COMPLETED',
    "administeredAt" TIMESTAMP(3),
    "nextDueAt" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Immunization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FamilyHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "recordedById" TEXT,
    "relationship" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "codeSystem" TEXT,
    "code" TEXT,
    "ageAtOnset" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FamilyHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "recordedById" TEXT,
    "testName" TEXT NOT NULL,
    "codeSystem" TEXT,
    "code" TEXT,
    "resultValue" TEXT NOT NULL,
    "numericValue" DECIMAL(12,4),
    "unit" TEXT,
    "referenceRange" TEXT,
    "interpretation" TEXT,
    "status" "LabResultStatus" NOT NULL DEFAULT 'FINAL',
    "collectedAt" TIMESTAMP(3),
    "resultAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VitalSign" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "recordedById" TEXT,
    "kind" "VitalSignKind" NOT NULL,
    "value" DECIMAL(12,4),
    "systolic" DECIMAL(12,4),
    "diastolic" DECIMAL(12,4),
    "unit" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "bodySite" TEXT,
    "notes" TEXT,
    CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientMedicalAid_patientId_isPrimary_idx" ON "PatientMedicalAid"("patientId", "isPrimary");
CREATE INDEX "PatientMedicalAid_patientId_validThrough_idx" ON "PatientMedicalAid"("patientId", "validThrough");
CREATE INDEX "Observation_patientId_type_name_recordedAt_idx" ON "Observation"("patientId", "type", "name", "recordedAt");
CREATE INDEX "PatientCondition_patientId_status_idx" ON "PatientCondition"("patientId", "status");
CREATE INDEX "PatientCondition_patientId_onsetDate_idx" ON "PatientCondition"("patientId", "onsetDate");
CREATE INDEX "PatientCondition_codeSystem_code_idx" ON "PatientCondition"("codeSystem", "code");
CREATE INDEX "PatientAllergy_patientId_status_idx" ON "PatientAllergy"("patientId", "status");
CREATE INDEX "PatientAllergy_patientId_substance_idx" ON "PatientAllergy"("patientId", "substance");
CREATE INDEX "MedicationStatement_patientId_status_idx" ON "MedicationStatement"("patientId", "status");
CREATE INDEX "MedicationStatement_patientId_startedAt_idx" ON "MedicationStatement"("patientId", "startedAt");
CREATE INDEX "MedicationStatement_prescriptionId_idx" ON "MedicationStatement"("prescriptionId");
CREATE INDEX "Immunization_patientId_administeredAt_idx" ON "Immunization"("patientId", "administeredAt");
CREATE INDEX "Immunization_patientId_nextDueAt_idx" ON "Immunization"("patientId", "nextDueAt");
CREATE INDEX "Immunization_encounterId_idx" ON "Immunization"("encounterId");
CREATE INDEX "FamilyHistory_patientId_relationship_idx" ON "FamilyHistory"("patientId", "relationship");
CREATE INDEX "FamilyHistory_patientId_condition_idx" ON "FamilyHistory"("patientId", "condition");
CREATE INDEX "LabResult_patientId_resultAt_idx" ON "LabResult"("patientId", "resultAt");
CREATE INDEX "LabResult_patientId_testName_resultAt_idx" ON "LabResult"("patientId", "testName", "resultAt");
CREATE INDEX "LabResult_codeSystem_code_idx" ON "LabResult"("codeSystem", "code");
CREATE INDEX "VitalSign_patientId_kind_measuredAt_idx" ON "VitalSign"("patientId", "kind", "measuredAt");
CREATE INDEX "VitalSign_encounterId_idx" ON "VitalSign"("encounterId");

ALTER TABLE "PatientMedicalAid" ADD CONSTRAINT "PatientMedicalAid_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientMedicalAid" ADD CONSTRAINT "PatientMedicalAid_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientCondition" ADD CONSTRAINT "PatientCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientCondition" ADD CONSTRAINT "PatientCondition_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientCondition" ADD CONSTRAINT "PatientCondition_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MedicationStatement" ADD CONSTRAINT "MedicationStatement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MedicationStatement" ADD CONSTRAINT "MedicationStatement_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationStatement" ADD CONSTRAINT "MedicationStatement_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicationStatement" ADD CONSTRAINT "MedicationStatement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Immunization" ADD CONSTRAINT "Immunization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Immunization" ADD CONSTRAINT "Immunization_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Immunization" ADD CONSTRAINT "Immunization_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FamilyHistory" ADD CONSTRAINT "FamilyHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyHistory" ADD CONSTRAINT "FamilyHistory_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyHistory" ADD CONSTRAINT "FamilyHistory_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
