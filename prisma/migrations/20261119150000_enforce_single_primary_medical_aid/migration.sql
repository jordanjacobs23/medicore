WITH ranked_primary_aids AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "patientId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS position
  FROM "PatientMedicalAid"
  WHERE "isPrimary" = true
)
UPDATE "PatientMedicalAid" AS aid
SET "isPrimary" = false
FROM ranked_primary_aids
WHERE aid."id" = ranked_primary_aids."id"
  AND ranked_primary_aids.position > 1;

ALTER TABLE "PatientMedicalAid"
ALTER COLUMN "isPrimary" SET DEFAULT false;

CREATE UNIQUE INDEX "PatientMedicalAid_one_primary_per_patient"
ON "PatientMedicalAid" ("patientId")
WHERE "isPrimary" = true;
