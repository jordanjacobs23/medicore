"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PatientCorrectionRequestStatus, PortalMessageSender } from "@prisma/client";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logSensitiveRecordAccess } from "@/lib/audit";

export async function acceptPopiaNotice(noticeVersion: string) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("A patient session is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(noticeVersion)) {
    throw new Error("Invalid privacy notice version.");
  }

  const requestHeaders = await headers();
  await prisma.patientConsent.upsert({
    where: {
      practiceId_patientId_noticeVersion: {
        practiceId: session.practiceId,
        patientId: session.userId,
        noticeVersion,
      },
    },
    create: {
      practiceId: session.practiceId,
      patientId: session.userId,
      noticeVersion,
      acceptedByIp: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    },
    update: {},
  });

  await logSensitiveRecordAccess(session, {
    action: "UPDATE",
    resourceType: "POPIA_NOTICE",
    resourceId: session.userId,
    metadata: { noticeVersion },
  });

  revalidatePath("/portal");
}

export async function submitCorrectionRequest(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("A patient session is required.");
  }
  const requestedFields = String(formData.get("requestedFields") ?? "").trim();
  const requestedChanges = String(formData.get("requestedChanges") ?? "").trim();
  if (!requestedFields || requestedFields.length > 250) {
    throw new Error("List the records or fields you want corrected (250 characters maximum).");
  }
  if (!requestedChanges || requestedChanges.length > 3500) {
    throw new Error("Describe the correction you are requesting (3500 characters maximum).");
  }

  const messageBody = `Patient correction request\nRecords or fields: ${requestedFields}\n\nRequested correction:\n${requestedChanges}`;
  await prisma.$transaction(async (tx) => {
    const correctionRequest = await tx.patientCorrectionRequest.create({
      data: {
        practiceId: session.practiceId,
        patientId: session.userId,
        requestedFields,
        requestedChanges,
        status: PatientCorrectionRequestStatus.PENDING,
      },
      select: { id: true },
    });
    await tx.portalMessage.create({
      data: {
        practiceId: session.practiceId,
        patientId: session.userId,
        senderPatientId: session.userId,
        senderType: PortalMessageSender.PATIENT,
        body: messageBody,
      },
    });
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "PATIENT",
        action: "CREATE",
        resourceType: "PATIENT_CORRECTION_REQUEST",
        resourceId: correctionRequest.id,
      },
    });
  });

  revalidatePath("/portal/privacy");
  revalidatePath("/portal/messages");
  revalidatePath("/messages");
  redirect("/portal/privacy?request=submitted");
}
