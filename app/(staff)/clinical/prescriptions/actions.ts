"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requirePermission,
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export async function cancelPrescription(
  prescriptionId: string,
  formData: FormData,
) {
  if (formData.get("confirmCancellation") !== "yes") {
    throw new Error("Confirm the cancellation before continuing.");
  }
  const session = await requirePermission("prescription:update");
  if (session.role !== "PRACTITIONER") {
    throw new Error("Only the prescribing practitioner can cancel this prescription.");
  }

  const prescription = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      practitionerId: session.userId,
      encounter: { practiceId: session.practiceId },
    },
    select: { id: true, patientId: true, status: true },
  });
  if (!prescription) {
    throw new Error("Prescription not found for this practitioner and practice.");
  }
  if (prescription.status !== "ACTIVE") {
    throw new Error("Only an active prescription can be cancelled.");
  }

  await requirePractitionerPatientAccess(prescription.patientId);

  await prisma.$transaction(async (tx) => {
    const result = await tx.prescription.updateMany({
      where: {
        id: prescription.id,
        practitionerId: session.userId,
        status: "ACTIVE",
        encounter: { practiceId: session.practiceId },
      },
      data: { status: "CANCELLED" },
    });
    if (result.count !== 1) {
      throw new Error("This prescription has already changed status.");
    }
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "UPDATE",
        resourceType: "PRESCRIPTION",
        resourceId: prescription.id,
        metadata: { patientId: prescription.patientId, status: "CANCELLED" },
      },
    });
  });

  revalidatePath("/clinical");
  revalidatePath(`/patients/${prescription.patientId}`);
  revalidatePath("/portal");
  redirect(`/patients/${prescription.patientId}`);
}

export async function signPrescription(prescriptionId: string) {
  const session = await requirePermission("prescription:update");
  if (session.role !== "PRACTITIONER") {
    throw new Error("Only the prescribing practitioner can sign this prescription.");
  }

  const prescription = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      practitionerId: session.userId,
      encounter: { practiceId: session.practiceId },
    },
  });
  if (!prescription) throw new Error("Prescription not found.");
  if (prescription.signedAt) throw new Error("This prescription is already signed.");
  await requirePractitionerPatientAccess(prescription.patientId);

  const signedAt = new Date();
  const signedHash = createHash("sha256").update(JSON.stringify({
    id: prescription.id,
    medication: prescription.medication,
    dosage: prescription.dosage,
    route: prescription.route,
    frequency: prescription.frequency,
    duration: prescription.duration,
    quantity: prescription.quantity,
    refills: prescription.refills,
    instructions: prescription.instructions,
    patientId: prescription.patientId,
    practitionerId: prescription.practitionerId,
    signedAt: signedAt.toISOString(),
  })).digest("hex");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.prescription.updateMany({
      where: { id: prescription.id, signedAt: null, status: "ACTIVE" },
      data: { signedAt, signedHash, status: "SIGNED" },
    });
    if (updated.count !== 1) throw new Error("This prescription has already changed.");
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "UPDATE",
        resourceType: "PRESCRIPTION",
        resourceId: prescription.id,
        metadata: { operation: "SIGN", signedHash, patientId: prescription.patientId },
      },
    });
  });

  revalidatePath("/clinical");
  revalidatePath(`/patients/${prescription.patientId}`);
  revalidatePath("/portal");
  redirect(`/patients/${prescription.patientId}`);
}

export async function handoffPrescription(
  prescriptionId: string,
  formData: FormData,
) {
  const session = await requirePermission("prescription:update");
  if (session.role !== "PRACTITIONER") {
    throw new Error("Only the prescribing practitioner can send a prescription to a pharmacy.");
  }
  const pharmacyId = String(formData.get("pharmacyId") ?? "").trim();
  if (!pharmacyId) throw new Error("Select a pharmacy.");

  const prescription = await prisma.prescription.findFirst({
    where: {
      id: prescriptionId,
      practitionerId: session.userId,
      encounter: { practiceId: session.practiceId },
    },
  });
  if (!prescription) throw new Error("Prescription not found.");
  if (!prescription.signedAt || !prescription.signedHash) {
    throw new Error("Sign the prescription before pharmacy hand-off.");
  }
  if (prescription.status === "CANCELLED") throw new Error("A cancelled prescription cannot be sent.");
  await requirePractitionerPatientAccess(prescription.patientId);

  const pharmacy = await prisma.pharmacy.findFirst({
    where: { id: pharmacyId, practiceId: session.practiceId, isActive: true },
  });
  if (!pharmacy) throw new Error("Pharmacy not found in this practice.");

  await prisma.$transaction(async (tx) => {
    await tx.prescription.update({
      where: { id: prescription.id },
      data: {
        pharmacyId: pharmacy.id,
        pharmacyStatus: "QUEUED",
        sentAt: new Date(),
        status: "SENT",
      },
    });
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "UPDATE",
        resourceType: "PRESCRIPTION",
        resourceId: prescription.id,
        metadata: {
          operation: "PHARMACY_HANDOFF_QUEUED",
          patientId: prescription.patientId,
          pharmacyId: pharmacy.id,
        },
      },
    });
  });

  revalidatePath("/clinical");
  revalidatePath(`/patients/${prescription.patientId}`);
  revalidatePath("/portal");
  redirect(`/patients/${prescription.patientId}`);
}
