"use server";

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
