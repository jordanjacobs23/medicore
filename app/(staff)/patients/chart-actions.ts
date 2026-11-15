"use server";

import {
  AllergySeverity,
  AllergyStatus,
  ImmunizationStatus,
  LabResultStatus,
  MedicationStatus,
  PatientConditionStatus,
  Prisma,
  VitalSignKind,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import {
  hasPermission,
  type Permission,
} from "@/components/clinical-core/src/rbac";
import {
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const clinicalChartPermissions = ["patient:update", "observation:create"] as const;
const medicalAidPermissions = ["patient:update", "claim:*"] as const;
const vitalPermissions = ["patient:update", "vital:create"] as const;

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalDate(formData: FormData, name: string, label: string) {
  const value = text(formData, name);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Enter a valid ${label}.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return date;
}

function optionalDateTime(formData: FormData, name: string, label: string) {
  const value = text(formData, name);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Enter a valid ${label}.`);
  return date;
}

function optionalDecimal(formData: FormData, name: string, label: string) {
  const value = text(formData, name);
  if (!value) return null;
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    throw new Error(`Enter a valid ${label}.`);
  }
  return new Prisma.Decimal(value);
}

function enumValue<T extends string>(
  value: string,
  options: readonly T[],
  label: string,
  fallback?: T,
): T {
  if (!value && fallback) return fallback;
  if (options.includes(value as T)) return value as T;
  throw new Error(`Choose a valid ${label}.`);
}

async function createChartRecord<T extends { id: string }>(
  patientId: string,
  permissions: Permission | readonly Permission[],
  resourceType: string,
  create: (tx: Prisma.TransactionClient, staffId: string) => Promise<T>,
) {
  const session = await getSessionContext();
  const allowedPermissions = Array.isArray(permissions) ? permissions : [permissions];
  if (
    !session ||
    session.userType !== "STAFF" ||
    !allowedPermissions.some((permission) => hasPermission(session.role, permission))
  ) {
    forbidden();
  }
  await requirePractitionerPatientAccess(patientId);

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) throw new Error("Patient not found in this practice.");

  await prisma.$transaction(async (tx) => {
    const record = await create(tx, session.userId);
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "CREATE",
        resourceType,
        resourceId: record.id,
      },
    });
  });

  revalidatePath(`/patients/${patientId}`);
}

export async function createPatientMedicalAid(patientId: string, formData: FormData) {
  const schemeName = text(formData, "schemeName");
  const membershipNumber = text(formData, "membershipNumber");
  if (!schemeName || !membershipNumber) {
    throw new Error("Medical-aid scheme and membership number are required.");
  }

  await createChartRecord(patientId, medicalAidPermissions, "PATIENT_MEDICAL_AID", (tx, staffId) =>
    tx.patientMedicalAid.create({
      data: {
        patientId,
        recordedById: staffId,
        schemeName,
        planName: text(formData, "planName") || null,
        membershipNumber,
        dependantCode: text(formData, "dependantCode") || null,
        principalMemberName: text(formData, "principalMemberName") || null,
        relationshipToPrincipal: text(formData, "relationshipToPrincipal") || null,
        preAuthorizationNumber: text(formData, "preAuthorizationNumber") || null,
        validFrom: optionalDate(formData, "validFrom", "valid-from date"),
        validThrough: optionalDate(formData, "validThrough", "valid-through date"),
        isPrimary: formData.get("isPrimary") === "on",
        notes: text(formData, "notes") || null,
      },
    }),
  );
}

export async function createPatientCondition(patientId: string, formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("Condition name is required.");

  await createChartRecord(patientId, clinicalChartPermissions, "PATIENT_CONDITION", (tx, staffId) =>
    tx.patientCondition.create({
      data: {
        patientId,
        name,
        codeSystem: text(formData, "codeSystem") || null,
        code: text(formData, "code") || null,
        status: enumValue(
          text(formData, "status"),
          Object.values(PatientConditionStatus),
          "condition status",
          PatientConditionStatus.ACTIVE,
        ),
        onsetDate: optionalDate(formData, "onsetDate", "onset date"),
        resolvedDate: optionalDate(formData, "resolvedDate", "resolved date"),
        notes: text(formData, "notes") || null,
        recordedById: staffId,
      },
    }),
  );
}

export async function createPatientAllergy(patientId: string, formData: FormData) {
  const substance = text(formData, "substance");
  if (!substance) throw new Error("Allergen or substance is required.");

  await createChartRecord(patientId, clinicalChartPermissions, "PATIENT_ALLERGY", (tx, staffId) =>
    tx.patientAllergy.create({
      data: {
        patientId,
        substance,
        reaction: text(formData, "reaction") || null,
        severity: enumValue(
          text(formData, "severity"),
          Object.values(AllergySeverity),
          "allergy severity",
          AllergySeverity.UNKNOWN,
        ),
        status: enumValue(
          text(formData, "status"),
          Object.values(AllergyStatus),
          "allergy status",
          AllergyStatus.ACTIVE,
        ),
        onsetDate: optionalDate(formData, "onsetDate", "onset date"),
        notes: text(formData, "notes") || null,
        recordedById: staffId,
      },
    }),
  );
}

export async function createMedicationStatement(patientId: string, formData: FormData) {
  const medication = text(formData, "medication");
  if (!medication) throw new Error("Medication name is required.");

  await createChartRecord(patientId, clinicalChartPermissions, "MEDICATION_STATEMENT", (tx, staffId) =>
    tx.medicationStatement.create({
      data: {
        patientId,
        medication,
        strength: text(formData, "strength") || null,
        dosage: text(formData, "dosage") || null,
        route: text(formData, "route") || null,
        frequency: text(formData, "frequency") || null,
        instructions: text(formData, "instructions") || null,
        status: enumValue(
          text(formData, "status"),
          Object.values(MedicationStatus),
          "medication status",
          MedicationStatus.ACTIVE,
        ),
        source: text(formData, "source") || null,
        startedAt: optionalDate(formData, "startedAt", "start date"),
        endedAt: optionalDate(formData, "endedAt", "end date"),
        notes: text(formData, "notes") || null,
        recordedById: staffId,
      },
    }),
  );
}

export async function createImmunization(patientId: string, formData: FormData) {
  const vaccine = text(formData, "vaccine");
  if (!vaccine) throw new Error("Vaccine name is required.");

  await createChartRecord(patientId, clinicalChartPermissions, "IMMUNIZATION", (tx) =>
    tx.immunization.create({
      data: {
        patientId,
        vaccine,
        productName: text(formData, "productName") || null,
        manufacturer: text(formData, "manufacturer") || null,
        lotNumber: text(formData, "lotNumber") || null,
        doseNumber: text(formData, "doseNumber") || null,
        route: text(formData, "route") || null,
        site: text(formData, "site") || null,
        status: enumValue(
          text(formData, "status"),
          Object.values(ImmunizationStatus),
          "immunization status",
          ImmunizationStatus.COMPLETED,
        ),
        administeredAt: optionalDateTime(formData, "administeredAt", "administration date"),
        nextDueAt: optionalDate(formData, "nextDueAt", "next due date"),
        notes: text(formData, "notes") || null,
      },
    }),
  );
}

export async function createFamilyHistory(patientId: string, formData: FormData) {
  const relationship = text(formData, "relationship");
  const condition = text(formData, "condition");
  if (!relationship || !condition) {
    throw new Error("Family relationship and condition are required.");
  }

  const ageAtOnsetValue = text(formData, "ageAtOnset");
  const ageAtOnset = ageAtOnsetValue ? Number(ageAtOnsetValue) : null;
  if (ageAtOnset !== null && (!Number.isInteger(ageAtOnset) || ageAtOnset < 0 || ageAtOnset > 130)) {
    throw new Error("Enter a valid age at onset.");
  }

  await createChartRecord(patientId, clinicalChartPermissions, "FAMILY_HISTORY", (tx, staffId) =>
    tx.familyHistory.create({
      data: {
        patientId,
        relationship,
        condition,
        codeSystem: text(formData, "codeSystem") || null,
        code: text(formData, "code") || null,
        ageAtOnset,
        notes: text(formData, "notes") || null,
        recordedById: staffId,
      },
    }),
  );
}

export async function createLabResult(patientId: string, formData: FormData) {
  const testName = text(formData, "testName");
  const resultValue = text(formData, "resultValue");
  if (!testName || !resultValue) {
    throw new Error("Test name and result are required.");
  }

  await createChartRecord(patientId, clinicalChartPermissions, "LAB_RESULT", (tx, staffId) =>
    tx.labResult.create({
      data: {
        patientId,
        testName,
        codeSystem: text(formData, "codeSystem") || null,
        code: text(formData, "code") || null,
        resultValue,
        numericValue: optionalDecimal(formData, "numericValue", "numeric result"),
        unit: text(formData, "unit") || null,
        referenceRange: text(formData, "referenceRange") || null,
        interpretation: text(formData, "interpretation") || null,
        status: enumValue(
          text(formData, "status"),
          Object.values(LabResultStatus),
          "lab result status",
          LabResultStatus.FINAL,
        ),
        collectedAt: optionalDateTime(formData, "collectedAt", "collection date"),
        resultAt: optionalDateTime(formData, "resultAt", "result date") ?? new Date(),
        notes: text(formData, "notes") || null,
        recordedById: staffId,
      },
    }),
  );
}

export async function createVitalSign(patientId: string, formData: FormData) {
  const kind = enumValue(
    text(formData, "kind"),
    Object.values(VitalSignKind),
    "vital sign",
  );
  const value = optionalDecimal(formData, "value", "measurement");
  const systolic = optionalDecimal(formData, "systolic", "systolic pressure");
  const diastolic = optionalDecimal(formData, "diastolic", "diastolic pressure");

  if (kind === VitalSignKind.BLOOD_PRESSURE) {
    if (!systolic || !diastolic) {
      throw new Error("Systolic and diastolic pressure are required for blood pressure.");
    }
  } else if (!value) {
    throw new Error("A numeric measurement is required.");
  }

  await createChartRecord(patientId, vitalPermissions, "VITAL_SIGN", (tx, staffId) =>
    tx.vitalSign.create({
      data: {
        patientId,
        kind,
        value,
        systolic,
        diastolic,
        unit: text(formData, "unit") || null,
        measuredAt: optionalDateTime(formData, "measuredAt", "measurement date") ?? new Date(),
        method: text(formData, "method") || null,
        bodySite: text(formData, "bodySite") || null,
        notes: text(formData, "notes") || null,
        recordedById: staffId,
      },
    }),
  );
}
