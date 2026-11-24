CREATE TYPE "EncounterSensitivity" AS ENUM ('NORMAL', 'SENSITIVE', 'RESTRICTED');
CREATE TYPE "PharmacyHandoffStatus" AS ENUM ('NOT_SENT', 'QUEUED', 'SENT', 'FAILED', 'ACKNOWLEDGED', 'CANCELLED');
CREATE TYPE "InteractionSeverity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE', 'CONTRAINDICATED');

ALTER TYPE "PrescriptionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "PrescriptionStatus" ADD VALUE IF NOT EXISTS 'SIGNED';
ALTER TYPE "PrescriptionStatus" ADD VALUE IF NOT EXISTS 'SENT';

ALTER TABLE "Encounter"
  ADD COLUMN "subjective" TEXT,
  ADD COLUMN "objective" TEXT,
  ADD COLUMN "assessment" TEXT,
  ADD COLUMN "plan" TEXT,
  ADD COLUMN "sensitivity" "EncounterSensitivity" NOT NULL DEFAULT 'NORMAL';

CREATE TABLE "EncounterAddendum" (
  "id" TEXT NOT NULL,
  "encounterId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sensitivity" "EncounterSensitivity" NOT NULL DEFAULT 'NORMAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EncounterAddendum_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DrugCatalog" (
  "id" TEXT NOT NULL,
  "practiceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "genericName" TEXT,
  "strength" TEXT,
  "form" TEXT,
  "route" TEXT,
  "activeIngredients" TEXT,
  "externalCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DrugCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DrugInteraction" (
  "id" TEXT NOT NULL,
  "drugAId" TEXT NOT NULL,
  "drugBId" TEXT NOT NULL,
  "severity" "InteractionSeverity" NOT NULL,
  "description" TEXT NOT NULL,
  "source" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DrugInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Pharmacy" (
  "id" TEXT NOT NULL,
  "practiceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "externalId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Prescription"
  ADD COLUMN "drugCatalogId" TEXT,
  ADD COLUMN "signedAt" TIMESTAMP(3),
  ADD COLUMN "signedHash" TEXT,
  ADD COLUMN "pdfHash" TEXT,
  ADD COLUMN "pharmacyId" TEXT,
  ADD COLUMN "pharmacyStatus" "PharmacyHandoffStatus" NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "pharmacyReference" TEXT,
  ADD COLUMN "interactionWarnings" JSONB NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX "DrugCatalog_practiceId_name_strength_key" ON "DrugCatalog"("practiceId", "name", "strength");
CREATE INDEX "DrugCatalog_practiceId_isActive_name_idx" ON "DrugCatalog"("practiceId", "isActive", "name");
CREATE UNIQUE INDEX "DrugInteraction_drugAId_drugBId_key" ON "DrugInteraction"("drugAId", "drugBId");
CREATE INDEX "DrugInteraction_drugAId_isActive_idx" ON "DrugInteraction"("drugAId", "isActive");
CREATE INDEX "DrugInteraction_drugBId_isActive_idx" ON "DrugInteraction"("drugBId", "isActive");
CREATE INDEX "Pharmacy_practiceId_isActive_name_idx" ON "Pharmacy"("practiceId", "isActive", "name");
CREATE INDEX "EncounterAddendum_encounterId_createdAt_idx" ON "EncounterAddendum"("encounterId", "createdAt");

ALTER TABLE "EncounterAddendum"
  ADD CONSTRAINT "EncounterAddendum_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "EncounterAddendum_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DrugCatalog"
  ADD CONSTRAINT "DrugCatalog_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DrugInteraction"
  ADD CONSTRAINT "DrugInteraction_drugAId_fkey" FOREIGN KEY ("drugAId") REFERENCES "DrugCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DrugInteraction_drugBId_fkey" FOREIGN KEY ("drugBId") REFERENCES "DrugCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Pharmacy"
  ADD CONSTRAINT "Pharmacy_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_drugCatalogId_fkey" FOREIGN KEY ("drugCatalogId") REFERENCES "DrugCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Prescription_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

