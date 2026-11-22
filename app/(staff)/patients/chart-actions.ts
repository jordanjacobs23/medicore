"use server";

import {
  AllergySeverity,
  AllergyStatus,
  ImmunizationStatus,
  LabResultStatus,
  MedicationStatus,
  PatientCorrectionRequestStatus,
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
const releasableLabResultStatuses: LabResultStatus[] = [
  LabResultStatus.FINAL,
  LabResultStatus.AMENDED,
  LabResultStatus.CORRECTED,
];

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
  const validFrom = optionalDate(formData, "validFrom", "valid-from date");
  const validThrough = optionalDate(formData, "validThrough", "valid-through date");
  if (!schemeName || !membershipNumber) {
    throw new Error("Medical-aid scheme and membership number are required.");
  }
  if (validFrom && validThrough && validThrough < validFrom) {
    throw new Error("The valid-through date must be on or after the valid-from date.");
  }

  await createChartRecord(patientId, medicalAidPermissions, "PATIENT_MEDICAL_AID", (tx, staffId) =>
    tx.patientMedicalAid.create({
      data: {
        patientId,
        recordedById: staffId,
        schemeName,
        schemeCode: text(formData, "schemeCode") || null,
        planName: text(formData, "planName") || null,
        membershipNumber,
        dependantCode: text(formData, "dependantCode") || null,
        principalMemberName: text(formData, "principalMemberName") || null,
        relationshipToPrincipal: text(formData, "relationshipToPrincipal") || null,
        preAuthorizationNumber: text(formData, "preAuthorizationNumber") || null,
        validFrom,
        validThrough,
        isPrimary: false,
        notes: text(formData, "notes") || null,
      },
    }),
  );
}

export async function switchPatientMedicalAid(patientId: string, medicalAidId: string) {
  const session = await getSessionContext();
  if (
    !session ||
    session.userType !== "STAFF" ||
    !medicalAidPermissions.some((permission) => hasPermission(session.role, permission))
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
    const selectedAid = await tx.patientMedicalAid.findFirst({
      where: { id: medicalAidId, patientId: patient.id },
      select: { id: true },
    });
    if (!selectedAid) throw new Error("Medical-aid cover not found for this patient.");

    const currentPrimary = await tx.patientMedicalAid.findFirst({
      where: { patientId: patient.id, isPrimary: true },
      select: { id: true },
    });
    if (currentPrimary?.id === selectedAid.id) return;

    await tx.patientMedicalAid.updateMany({
      where: { patientId: patient.id, isPrimary: true },
      data: { isPrimary: false },
    });
    await tx.patientMedicalAid.update({
      where: { id: selectedAid.id },
      data: { isPrimary: true },
    });
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "UPDATE",
        resourceType: "PATIENT_MEDICAL_AID",
        resourceId: selectedAid.id,
        metadata: {
          operation: "SWITCH_PRIMARY",
          previousMedicalAidId: currentPrimary?.id ?? null,
        },
      },
    });
  });

  revalidatePath(`/patients/${patient.id}`);
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
  const status = enumValue(
    text(formData, "status"),
    Object.values(LabResultStatus),
    "lab result status",
    LabResultStatus.FINAL,
  );
  const releaseToPatient = formData.get("releaseToPatient") === "on";
  if (releaseToPatient && !releasableLabResultStatuses.includes(status)) {
    throw new Error("Only final, amended, or corrected results can be released to the patient portal.");
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
        status,
        collectedAt: optionalDateTime(formData, "collectedAt", "collection date"),
        resultAt: optionalDateTime(formData, "resultAt", "result date") ?? new Date(),
        releasedAt: releaseToPatient ? new Date() : null,
        notes: text(formData, "notes") || null,
        recordedById: staffId,
      },
    }),
  );
}

export async function updateLabResultRelease(patientId: string, resultId: string, formData: FormData) {
  const session = await getSessionContext();
  if (
    !session ||
    session.userType !== "STAFF" ||
    !clinicalChartPermissions.some((permission) => hasPermission(session.role, permission))
  ) {
    forbidden();
  }
  await requirePractitionerPatientAccess(patientId);
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) throw new Error("Patient not found in this practice.");
  const result = await prisma.labResult.findFirst({
    where: { id: resultId, patientId: patient.id },
    select: { id: true, status: true, releasedAt: true },
  });
  if (!result) throw new Error("Lab result not found for this patient.");

  const release = formData.get("released") === "yes";
  if (release && !releasableLabResultStatuses.includes(result.status)) {
    throw new Error("Only final, amended, or corrected results can be released to the patient portal.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.labResult.update({ where: { id: result.id }, data: { releasedAt: release ? result.releasedAt ?? new Date() : null } });
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "UPDATE",
        resourceType: "LAB_RESULT_RELEASE",
        resourceId: result.id,
        metadata: { releasedToPatient: release },
      },
    });
  });
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/portal/results");
  revalidatePath("/portal");
}

export async function updatePatientCorrectionRequestStatus(requestId: string, formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "STAFF" || !hasPermission(session.role, "patient:update")) {
    forbidden();
  }
  const status = enumValue(
    text(formData, "status"),
    Object.values(PatientCorrectionRequestStatus),
    "request status",
  );
  const reviewNote = text(formData, "reviewNote");
  if (reviewNote.length > 1000) throw new Error("Practice responses must be 1000 characters or fewer.");
  const request = await prisma.patientCorrectionRequest.findFirst({
    where: { id: requestId, practiceId: session.practiceId },
    select: { id: true, patientId: true },
  });
  if (!request) throw new Error("Correction request not found in this practice.");
  await requirePractitionerPatientAccess(request.patientId);

  await prisma.$transaction(async (tx) => {
    await tx.patientCorrectionRequest.update({
      where: { id: request.id },
      data: {
        status,
        reviewNote: reviewNote || null,
        reviewedAt: status === PatientCorrectionRequestStatus.PENDING ? null : new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "UPDATE",
        resourceType: "PATIENT_CORRECTION_REQUEST",
        resourceId: request.id,
        metadata: { status },
      },
    });
  });
  revalidatePath(`/patients/${request.patientId}`);
  revalidatePath("/portal/privacy");
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
