"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

  redirect("/portal");
}
