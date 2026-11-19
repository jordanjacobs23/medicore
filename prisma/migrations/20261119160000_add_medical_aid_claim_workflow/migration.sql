ALTER TYPE "ClaimStatus" ADD VALUE 'ACKNOWLEDGED';
ALTER TYPE "ClaimStatus" ADD VALUE 'PARTIALLY_APPROVED';
ALTER TYPE "ClaimStatus" ADD VALUE 'REJECTED';
ALTER TYPE "ClaimStatus" ADD VALUE 'RESUBMITTED';
ALTER TYPE "ClaimStatus" ADD VALUE 'WRITTEN_OFF';
ALTER TYPE "PaymentMethod" ADD VALUE 'MEDICAL_AID';
CREATE TYPE "PaymentPayerType" AS ENUM ('PATIENT', 'MEDICAL_AID');

ALTER TABLE "PatientMedicalAid"
ADD COLUMN "schemeCode" TEXT;

ALTER TABLE "Invoice"
ADD COLUMN "encounterId" TEXT,
ADD COLUMN "patientShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "schemeShare" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE INDEX "Invoice_encounterId_idx" ON "Invoice"("encounterId");
ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_encounterId_fkey"
FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "tariffCode" TEXT NOT NULL,
  "icd10Code" TEXT,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "modifierCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
ALTER TABLE "InvoiceLine"
ADD CONSTRAINT "InvoiceLine_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Claim"
ADD COLUMN "encounterId" TEXT,
ADD COLUMN "schemeCode" TEXT,
ADD COLUMN "memberNumber" TEXT,
ADD COLUMN "dependantCode" TEXT,
ADD COLUMN "amountAuthorised" DECIMAL(12,2),
ADD COLUMN "amountPaid" DECIMAL(12,2),
ADD COLUMN "rejectReason" TEXT,
ADD COLUMN "switchingRef" TEXT,
ADD COLUMN "rawRequest" JSONB,
ADD COLUMN "rawResponse" JSONB,
ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN "responseAt" TIMESTAMP(3),
ADD COLUMN "resubmissionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Payment"
ADD COLUMN "payerType" "PaymentPayerType" NOT NULL DEFAULT 'PATIENT';

CREATE INDEX "Claim_practiceId_status_idx" ON "Claim"("practiceId", "status");
CREATE INDEX "Claim_patientId_idx" ON "Claim"("patientId");
CREATE INDEX "Claim_encounterId_idx" ON "Claim"("encounterId");
CREATE INDEX "Claim_switchingRef_idx" ON "Claim"("switchingRef");
ALTER TABLE "Claim"
ADD CONSTRAINT "Claim_encounterId_fkey"
FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ClaimEvent" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClaimEvent_claimId_createdAt_idx" ON "ClaimEvent"("claimId", "createdAt");
ALTER TABLE "ClaimEvent"
ADD CONSTRAINT "ClaimEvent_claimId_fkey"
FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
