"use server";

import { PortalMessageSender } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function sendPatientMessage(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("You must be signed in as a patient.");
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Enter a message before sending.");
  }
  if (body.length > 4000) {
    throw new Error("Messages must be 4000 characters or fewer.");
  }

  await prisma.portalMessage.create({
    data: {
      practiceId: session.practiceId,
      patientId: session.userId,
      senderPatientId: session.userId,
      senderType: PortalMessageSender.PATIENT,
      body,
    },
  });

  revalidatePath("/portal/messages");
}
