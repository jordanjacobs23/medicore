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
  if (medication && !dosage) {
    throw new Error("Prescription dosage is required.");
  }
  if (dosage && !medication) {
    throw new Error("Prescription medication is required.");
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

    if (medication) {
      await tx.prescription.create({
        data: {
          encounterId: encounter.id,
          patientId: patient.id,
          practitionerId: practitioner.id,
          medication,
          dosage,
          instructions: instructions || null,
        },
      });
    }
  });

  revalidatePath("/clinical");
  revalidatePath(`/patients/${patientId}`);
  redirect("/clinical");
}
