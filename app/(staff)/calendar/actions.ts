"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export async function createAppointment(formData: FormData) {
  const session = await requirePermission("appointment:*");
  const patientId = String(formData.get("patientId") ?? "");
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const scheduledAtValue = String(formData.get("scheduledAt") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const scheduledAt = new Date(scheduledAtValue);

  if (!patientId || !scheduledAtValue || Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Patient and appointment date/time are required.");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) {
    throw new Error("Patient not found in this practice.");
  }

  if (practitionerId) {
    const practitioner = await prisma.staff.findFirst({
      where: {
        id: practitionerId,
        practiceId: session.practiceId,
        isActive: true,
        role: "PRACTITIONER",
      },
      select: { id: true },
    });
    if (!practitioner) {
      throw new Error("Practitioner not found in this practice.");
    }
  }

  await prisma.appointment.create({
    data: {
      practiceId: session.practiceId,
      patientId,
      practitionerId: practitionerId || null,
      scheduledAt,
      reason: reason || null,
      status: AppointmentStatus.BOOKED,
    },
  });

  revalidatePath("/calendar");
  redirect("/calendar");
}

export async function updateAppointmentStatus(formData: FormData) {
  const session = await requirePermission("appointment:*");
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const statusValue = String(formData.get("status") ?? "");
  const status = statusValue as AppointmentStatus;

  if (!appointmentId || !Object.values(AppointmentStatus).includes(status)) {
    throw new Error("A valid appointment and status are required.");
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!appointment) {
    throw new Error("Appointment not found in this practice.");
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status },
  });

  revalidatePath("/calendar");
}
