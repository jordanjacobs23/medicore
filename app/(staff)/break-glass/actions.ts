"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { logSensitiveRecordAccess } from "@/lib/audit";

export async function requestBreakGlass(formData: FormData) {
  const session = await requirePermission("patient:read");
  const patientId = String(formData.get("patientId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!patientId || reason.length < 20) {
    throw new Error("Select a patient and provide a reason of at least 20 characters.");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) throw new Error("Patient not found.");

  const request = await prisma.breakGlassRequest.create({
    data: {
      practiceId: session.practiceId,
      patientId,
      requesterStaffId: session.userId,
      reason,
    },
  });
  await logSensitiveRecordAccess(session, {
    action: "CREATE",
    resourceType: "BREAK_GLASS_REQUEST",
    resourceId: request.id,
    metadata: { patientId },
  });

  redirect("/break-glass?requested=1");
}

export async function reviewBreakGlass(formData: FormData) {
  const session = await requirePermission("staff:*");
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!["APPROVED", "DENIED"].includes(decision)) {
    throw new Error("Invalid break-glass decision.");
  }

  const request = await prisma.breakGlassRequest.findFirst({
    where: { id: requestId, practiceId: session.practiceId, status: "PENDING" },
    select: { id: true, requesterStaffId: true, patientId: true },
  });
  if (!request) throw new Error("Pending request not found.");
  if (request.requesterStaffId === session.userId) {
    throw new Error("Break-glass requests cannot be self-approved.");
  }

  await prisma.breakGlassRequest.update({
    where: { id: request.id },
    data: {
      status: decision === "APPROVED" ? "APPROVED" : "DENIED",
      reviewerStaffId: session.userId,
      reviewedAt: new Date(),
      expiresAt: decision === "APPROVED" ? new Date(Date.now() + 60 * 60 * 1000) : null,
    },
  });
  await logSensitiveRecordAccess(session, {
    action: decision === "APPROVED" ? "UPDATE" : "UPDATE",
    resourceType: "BREAK_GLASS_REQUEST",
    resourceId: request.id,
    metadata: { decision, patientId: request.patientId },
  });

  redirect("/break-glass?reviewed=1");
}
