"use server";

import { ObservationType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requirePermission,
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createEncounter(formData: FormData) {
  const session = await requirePermission("encounter:create");
  const patientId = text(formData, "patientId");
  const chiefComplaint = text(formData, "chiefComplaint");
  const diagnosis = text(formData, "diagnosis");
  const notes = text(formData, "notes");
  const observationTypeValue = text(formData, "observationType");
  const observationName = text(formData, "observationName");
  const observationValue = text(formData, "observationValue");
  const observationUnit = text(formData, "observationUnit");
  const medication = text(formData, "medication");
  const dosage = text(formData, "dosage");
  const route = text(formData, "route");
  const frequency = text(formData, "frequency");
  const duration = text(formData, "duration");
  const quantity = text(formData, "quantity");
  const refillsValue = text(formData, "refills");
  const instructions = text(formData, "instructions");

  if (!patientId || !chiefComplaint) {
    throw new Error("Patient and chief complaint are required.");
  }

  await requirePractitionerPatientAccess(patientId);

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) {
    throw new Error("Patient not found in this practice.");
  }

  const practitioner = await prisma.staff.findFirst({
    where: {
      id: session.userId,
      practiceId: session.practiceId,
      isActive: true,
      role: "PRACTITIONER",
    },
    select: { id: true },
  });
  if (!practitioner) {
    throw new Error("The current staff member is not active in this practice.");
  }

  const hasObservation = Boolean(observationName || observationValue);
  if (hasObservation && (!observationName || !observationValue)) {
    throw new Error("Observation name and value are both required.");
  }
  const hasPrescription = [
    medication,
    dosage,
    route,
    frequency,
    duration,
    quantity,
    instructions,
  ].some(Boolean);
  let refills = 0;
  if (hasPrescription) {
    await requirePermission("prescription:create");
    if (!medication || !dosage || !route || !frequency || !quantity) {
      throw new Error(
        "Medication, dose, route, frequency, and quantity are required for a prescription.",
      );
    }
    if (
      medication.length > 250 ||
      dosage.length > 250 ||
      route.length > 100 ||
      frequency.length > 150 ||
      duration.length > 100 ||
      quantity.length > 100 ||
      instructions.length > 1000
    ) {
      throw new Error("One or more prescription fields are too long.");
    }
    if (refillsValue && !/^\d{1,2}$/.test(refillsValue)) {
      throw new Error("Refills must be a whole number between 0 and 99.");
    }
    refills = refillsValue ? Number(refillsValue) : 0;
    if (refills > 99) {
      throw new Error("Refills must be a whole number between 0 and 99.");
    }
  }

  let observationType: ObservationType | undefined;
  if (hasObservation) {
    if (!Object.values(ObservationType).includes(observationTypeValue as ObservationType)) {
      throw new Error("A valid observation type is required.");
    }
    observationType = observationTypeValue as ObservationType;
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const encounter = await tx.encounter.create({
      data: {
        practiceId: session.practiceId,
        patientId: patient.id,
        practitionerId: practitioner.id,
        chiefComplaint,
        diagnosis: diagnosis || null,
        notes: notes || null,
      },
    });

    if (hasObservation && observationType) {
      await tx.observation.create({
        data: {
          encounterId: encounter.id,
          patientId: patient.id,
          recordedById: practitioner.id,
          type: observationType,
          name: observationName,
          value: observationValue,
          unit: observationUnit || null,
        },
      });
    }

    if (hasPrescription) {
      const prescription = await tx.prescription.create({
        data: {
          encounterId: encounter.id,
          patientId: patient.id,
          practitionerId: practitioner.id,
          medication,
          dosage,
          route,
          frequency,
          duration: duration || null,
          quantity,
          refills,
          instructions: instructions || null,
        },
      });
      await tx.auditLog.create({
        data: {
          practiceId: session.practiceId,
          actorId: practitioner.id,
          actorType: "STAFF",
          action: "CREATE",
          resourceType: "PRESCRIPTION",
          resourceId: prescription.id,
          metadata: { patientId: patient.id, encounterId: encounter.id },
        },
      });
    }
  });

  revalidatePath("/clinical");
  revalidatePath(`/patients/${patientId}`);
  redirect("/clinical");
}
