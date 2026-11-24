"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { createAppointmentInSlot, rescheduleAppointmentInSlot } from "@/lib/appointments/mutations";
import { cancelPendingAppointmentReminders } from "@/lib/appointments/reminders";

export async function createAppointment(formData: FormData) {
  const session = await requirePermission("appointment:*");
  const patientId = String(formData.get("patientId") ?? "");
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const kindValue = String(formData.get("kind") ?? "IN_PERSON");
  const kind = kindValue === "TELEHEALTH" ? "TELEHEALTH" : "IN_PERSON";

  if (!patientId || !practitionerId || !date || !time) {
    throw new Error("Patient, practitioner, date, and available time are required.");
  }
  if (reason.length > 500) {
    throw new Error("The reason for the visit must be 500 characters or fewer.");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) {
    throw new Error("Patient not found in this practice.");
  }

  await createAppointmentInSlot({
    practiceId: session.practiceId,
    patientId,
    practitionerId,
    dateKey: date,
    time,
    reason: reason || null,
    kind,
  });

  revalidatePath("/calendar");
  revalidatePath("/today");
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
    where: {
      id: appointmentId,
      practiceId: session.practiceId,
      ...(session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    select: { id: true },
  });
  if (!appointment) {
    throw new Error("Appointment not found in this practice.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status },
    });
    if (status !== AppointmentStatus.BOOKED) {
      await cancelPendingAppointmentReminders(tx, appointment.id);
    }
  });

  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function rescheduleStaffAppointment(formData: FormData) {
  const session = await requirePermission("appointment:*");
  const appointmentId = String(formData.get("appointmentId") ?? "");
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  if (!appointmentId || !practitionerId || !date || !time) {
    throw new Error("Choose an available appointment time.");
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      practiceId: session.practiceId,
      ...(session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    select: { id: true },
  });
  if (!appointment) throw new Error("Appointment not found in this practice.");

  await rescheduleAppointmentInSlot({
    practiceId: session.practiceId,
    appointmentId,
    currentPractitionerId: session.role === "PRACTITIONER" ? session.userId : undefined,
    practitionerId,
    dateKey: date,
    time,
  });

  revalidatePath("/calendar");
  revalidatePath("/today");
  redirect("/calendar");
}
