"use server";

import { createHash } from "node:crypto";
import { EncounterSensitivity, ObservationType, Prisma } from "@prisma/client";
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
  const subjective = text(formData, "subjective");
  const objective = text(formData, "objective");
  const assessment = text(formData, "assessment");
  const plan = text(formData, "plan");
  const sensitivity = text(formData, "sensitivity");
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
  const drugCatalogId = text(formData, "drugCatalogId");

  if (!patientId || !chiefComplaint) {
    throw new Error("Patient and chief complaint are required.");
  }
  if (!["NORMAL", "SENSITIVE", "RESTRICTED"].includes(sensitivity || "NORMAL")) {
    throw new Error("A valid encounter sensitivity category is required.");
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

  let interactionWarnings: Prisma.JsonArray = [];
  if (hasPrescription && drugCatalogId) {
    const catalogDrug = await prisma.drugCatalog.findFirst({
      where: { id: drugCatalogId, practiceId: session.practiceId, isActive: true },
    });
    if (!catalogDrug) throw new Error("The selected catalog medication is not available.");

    const activeAllergies = await prisma.patientAllergy.findMany({
      where: { patientId, status: "ACTIVE" },
      select: { substance: true, reaction: true, severity: true },
    });
    const allergyText = [
      catalogDrug.name,
      catalogDrug.genericName,
      catalogDrug.activeIngredients,
    ].filter((value): value is string => Boolean(value)).join(" ").toLowerCase();
    const allergyMatches = activeAllergies.filter((allergy) =>
      allergyText.includes(allergy.substance.toLowerCase()),
    );
    if (allergyMatches.length) {
      throw new Error(
        `Potential allergy conflict: ${allergyMatches.map((item) => item.substance).join(", ")}.`,
      );
    }

    const activeMedicationIds = await prisma.medicationStatement.findMany({
      where: { patientId, status: "ACTIVE", prescriptionId: { not: null } },
      select: { prescription: { select: { drugCatalogId: true } } },
    });
    const otherDrugIds = activeMedicationIds
      .map((item) => item.prescription?.drugCatalogId)
      .filter((id): id is string => Boolean(id));
    const interactions = await prisma.drugInteraction.findMany({
      where: {
        isActive: true,
        OR: [
          { drugAId: drugCatalogId, drugBId: { in: otherDrugIds } },
          { drugBId: drugCatalogId, drugAId: { in: otherDrugIds } },
        ],
      },
      include: { drugA: { select: { name: true } }, drugB: { select: { name: true } } },
    });
    interactionWarnings = interactions.map((interaction) => ({
      severity: interaction.severity,
      description: interaction.description,
      drugs: [interaction.drugA.name, interaction.drugB.name],
    })) as Prisma.JsonArray;
    const contraindication = interactions.find(
      (interaction) => interaction.severity === "CONTRAINDICATED" || interaction.severity === "SEVERE",
    );
    if (contraindication) {
      throw new Error(
        `Safety warning (${contraindication.severity}): ${contraindication.description}`,
      );
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
        subjective: subjective || null,
        objective: objective || null,
        assessment: assessment || null,
        plan: plan || null,
        sensitivity: EncounterSensitivity[sensitivity as keyof typeof EncounterSensitivity] ?? EncounterSensitivity.NORMAL,
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
          drugCatalogId: drugCatalogId || null,
          interactionWarnings,
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

export async function completeEncounter(formData: FormData) {
  const session = await requirePermission("encounter:update");
  const encounterId = text(formData, "encounterId");
  if (!encounterId) throw new Error("Encounter is required.");

  const encounter = await prisma.encounter.findFirst({
    where: {
      id: encounterId,
      practiceId: session.practiceId,
      ...(session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    select: {
      id: true,
      patientId: true,
      status: true,
      chiefComplaint: true,
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
      diagnosis: true,
      notes: true,
      sensitivity: true,
    },
  });
  if (!encounter) throw new Error("Encounter not found in this practice.");
  if (encounter.status !== "IN_PROGRESS") {
    throw new Error("Only an in-progress encounter can be completed.");
  }

  const signedAt = new Date();
  const lockedHash = createHash("sha256")
    .update(JSON.stringify({
      id: encounter.id,
      chiefComplaint: encounter.chiefComplaint,
      subjective: encounter.subjective,
      objective: encounter.objective,
      assessment: encounter.assessment,
      plan: encounter.plan,
      diagnosis: encounter.diagnosis,
      notes: encounter.notes,
      sensitivity: encounter.sensitivity,
    }))
    .digest("hex");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.encounter.updateMany({
      where: { id: encounter.id, practiceId: session.practiceId, status: "IN_PROGRESS" },
      data: { status: "COMPLETED", endedAt: signedAt, signedAt, lockedHash },
    });
    if (updated.count !== 1) throw new Error("Encounter changed. Refresh and try again.");

    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "UPDATE",
        resourceType: "ENCOUNTER",
        resourceId: encounter.id,
        metadata: { operation: "SIGN_AND_COMPLETE", lockedHash },
      },
    });
  });

  revalidatePath("/clinical");
  revalidatePath(`/patients/${encounter.patientId}`);
}

export async function addEncounterAddendum(formData: FormData) {
  const session = await requirePermission("encounter:update");
  const encounterId = text(formData, "encounterId");
  const addendumText = text(formData, "addendum");
  const sensitivity = text(formData, "sensitivity") || "NORMAL";
  if (!encounterId || !addendumText) throw new Error("Encounter and addendum text are required.");
  if (!["NORMAL", "SENSITIVE", "RESTRICTED"].includes(sensitivity)) {
    throw new Error("A valid addendum sensitivity category is required.");
  }
  if (addendumText.length > 5000) throw new Error("Addendum text is too long.");

  const encounter = await prisma.encounter.findFirst({
    where: {
      id: encounterId,
      practiceId: session.practiceId,
      ...(session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    select: { id: true, patientId: true },
  });
  if (!encounter) throw new Error("Encounter not found in this practice.");
  await requirePractitionerPatientAccess(encounter.patientId);

  await prisma.$transaction(async (tx) => {
    const addendum = await tx.encounterAddendum.create({
      data: {
        encounterId: encounter.id,
        authorId: session.userId,
        text: addendumText,
        sensitivity: sensitivity as "NORMAL" | "SENSITIVE" | "RESTRICTED",
      },
    });
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "CREATE",
        resourceType: "ENCOUNTER_ADDENDUM",
        resourceId: addendum.id,
        metadata: { encounterId: encounter.id, patientId: encounter.patientId, sensitivity },
      },
    });
  });

  revalidatePath(`/patients/${encounter.patientId}`);
  revalidatePath("/clinical");
}
