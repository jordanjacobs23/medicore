ALTER TABLE "Patient" ALTER COLUMN "clerkId" DROP NOT NULL;

ALTER TABLE "Patient" ADD COLUMN "clerkInvitationId" TEXT;

CREATE UNIQUE INDEX "Patient_clerkInvitationId_key" ON "Patient"("clerkInvitationId");

UPDATE "Patient"
SET "clerkId" = NULL
WHERE left("clerkId", 13) = 'test_patient_';
