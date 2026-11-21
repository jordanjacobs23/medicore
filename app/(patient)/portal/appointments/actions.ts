"use server";

import { AppointmentReminderStatus, AppointmentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createAppointmentInSlot, rescheduleAppointmentInSlot } from "@/lib/appointments/mutations";
import { cancelPendingAppointmentReminders, refreshPatientAppointmentReminders } from "@/lib/appointments/reminders";

export async function bookPatientAppointment(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("You must be signed in as a patient.");
  }

  const practitionerId = String(formData.get("practitionerId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!date || !time) {
    throw new Error("Choose an available appointment time.");
  }
  if (!practitionerId) {
    throw new Error("Choose a practitioner.");
  }
  if (reason.length > 500) {
    throw new Error("The reason for your visit must be 500 characters or fewer.");
  }

  const smsRemindersEnabled = formData.has("smsOptInPreference")
    ? formData.get("smsRemindersEnabled") === "on"
    : undefined;
  await createAppointmentInSlot({
    practiceId: session.practiceId,
    patientId: session.userId,
    practitionerId,
    dateKey: date,
    time,
    reason: reason || null,
    smsRemindersEnabled,
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

  await prisma.$transaction(async (tx) => {
    const cancelled = await tx.appointment.updateMany({
      where: {
        id: appointment.id,
        practiceId: session.practiceId,
        patientId: session.userId,
        status: AppointmentStatus.BOOKED,
        scheduledAt: { gt: new Date() },
      },
      data: { status: AppointmentStatus.CANCELLED },
    });
    if (cancelled.count !== 1) throw new Error("This appointment can no longer be cancelled.");
    await cancelPendingAppointmentReminders(tx, appointment.id);
  });

  revalidatePath("/portal");
  revalidatePath("/portal/appointments");
  revalidatePath("/calendar");
}

export async function reschedulePatientAppointment(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("You must be signed in as a patient.");
  }

  const appointmentId = String(formData.get("appointmentId") ?? "");
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  if (!appointmentId || !practitionerId || !date || !time) {
    throw new Error("Choose an available appointment time.");
  }

  await rescheduleAppointmentInSlot({
    practiceId: session.practiceId,
    appointmentId,
    patientId: session.userId,
    practitionerId,
    dateKey: date,
    time,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/appointments");
  revalidatePath("/calendar");
  redirect("/portal/appointments");
}

export async function updateSmsReminderPreference(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("You must be signed in as a patient.");
  }
  const enabled = formData.get("smsRemindersEnabled") === "on";
  const patient = await prisma.patient.findFirst({
    where: { id: session.userId, practiceId: session.practiceId },
    select: { phone: true, smsRemindersEnabled: true },
  });
  if (!patient) throw new Error("Patient account not found.");
  if (enabled && !patient.phone?.trim()) {
    throw new Error("Add a phone number to your patient record before enabling SMS reminders.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: session.userId },
      data: { smsRemindersEnabled: enabled },
    });
    if (enabled && !patient.smsRemindersEnabled) {
      await refreshPatientAppointmentReminders(tx, session.userId, session.practiceId);
    } else if (!enabled) {
      await tx.appointmentReminder.updateMany({
        where: {
          appointment: { is: { patientId: session.userId, practiceId: session.practiceId } },
          status: {
            in: [
              AppointmentReminderStatus.PENDING,
              AppointmentReminderStatus.PROCESSING,
              AppointmentReminderStatus.FAILED,
            ],
          },
        },
        data: { status: AppointmentReminderStatus.CANCELLED, nextAttemptAt: null, processingAt: null },
      });
    }
  });
  revalidatePath("/portal/appointments");
  redirect(`/portal/appointments?reminders=${enabled ? "enabled" : "disabled"}`);
}
