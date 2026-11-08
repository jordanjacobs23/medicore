"use server";

import { AppointmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";

import { prisma } from "@/lib/prisma";

export async function bookPatientAppointment(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("You must be signed in as a patient.");
  }

  const practitionerId = String(formData.get("practitionerId") ?? "");
  const scheduledAtValue = String(formData.get("scheduledAt") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const scheduledAt = new Date(scheduledAtValue);

  if (!scheduledAtValue || Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Choose a valid appointment date and time.");
  }
  if (scheduledAt <= new Date()) {
    throw new Error("Appointments must be booked for a future date and time.");
  }
  if (!practitionerId) {
    throw new Error("Choose a practitioner.");
  }
  if (reason.length > 500) {
    throw new Error("The reason for your visit must be 500 characters or fewer.");
  }

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
    throw new Error("The selected practitioner is unavailable.");
  }

  const thirtyMinutesBefore = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
  const thirtyMinutesAfter = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      practiceId: session.practiceId,
      practitionerId,
      scheduledAt: { gte: thirtyMinutesBefore, lte: thirtyMinutesAfter },
      status: { in: [AppointmentStatus.BOOKED, AppointmentStatus.ARRIVED, AppointmentStatus.IN_PROGRESS] },
    },
    select: { id: true },
  });
  if (conflictingAppointment) {
    throw new Error("That practitioner has another appointment near this time. Please choose another time.");
  }

  await prisma.appointment.create({
    data: {
      practiceId: session.practiceId,
      patientId: session.userId,
      practitionerId,
      scheduledAt,
      reason: reason || null,
      status: AppointmentStatus.BOOKED,
    },
  });

  revalidatePath("/portal");
  revalidatePath("/portal/appointments");
  redirect("/portal/appointments");
}

export async function cancelPatientAppointment(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("You must be signed in as a patient.");
  }

  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) {
    throw new Error("A valid appointment is required.");
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      practiceId: session.practiceId,
      patientId: session.userId,
    },
    select: { id: true, scheduledAt: true, status: true },
  });
  if (!appointment) {
    throw new Error("Appointment not found.");
  }
  if (appointment.status !== AppointmentStatus.BOOKED) {
    throw new Error("This appointment can no longer be cancelled.");
  }
  if (appointment.scheduledAt <= new Date()) {
    throw new Error("Past appointments cannot be cancelled.");
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: AppointmentStatus.CANCELLED },
  });

  revalidatePath("/portal");
  revalidatePath("/portal/appointments");
}
