"use server";

import { PortalMessageSender } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  requirePermission,
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export async function sendStaffMessage(formData: FormData) {
  const session = await requirePermission("patient:read");
  const patientId = String(formData.get("patientId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!patientId) {
    throw new Error("A patient is required.");
  }
  await requirePractitionerPatientAccess(patientId);
  if (!body) {
    throw new Error("Enter a message before sending.");
  }
  if (body.length > 4000) {
    throw new Error("Messages must be 4000 characters or fewer.");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) {
    throw new Error("Patient not found in this practice.");
  }

  await prisma.$transaction(async (tx) => {
    const message = await tx.portalMessage.create({
      data: {
        practiceId: session.practiceId,
        patientId: patient.id,
        senderStaffId: session.userId,
        senderType: PortalMessageSender.PRACTICE,
        body,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "STAFF",
        action: "CREATE",
        resourceType: "PORTAL_MESSAGE",
        resourceId: message.id,
        metadata: { patientId: patient.id },
      },
    });
  });
  revalidatePath("/messages");
  revalidatePath(`/messages/${patient.id}`);
}
