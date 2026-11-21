"use server";

import { AppointmentReminderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { refreshPatientAppointmentReminders } from "@/lib/appointments/reminders";

function value(formData: FormData, name: string, maxLength = 200) {
  const raw = formData.get(name);
  const result = typeof raw === "string" ? raw.trim() : "";
  if (result.length > maxLength) throw new Error(`${name} is too long.`);
  return result || null;
}

export async function updatePatientProfile(formData: FormData) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    throw new Error("You must be signed in as a patient.");
  }

  const phone = value(formData, "phone", 40);
  const smsRemindersEnabled = formData.get("smsRemindersEnabled") === "on";
  if (smsRemindersEnabled && !phone) {
    throw new Error("Add a phone number before enabling SMS appointment reminders.");
  }

  const profile = {
    preferredName: value(formData, "preferredName"),
    phone,
    alternatePhone: value(formData, "alternatePhone", 40),
    addressLine1: value(formData, "addressLine1"),
    addressLine2: value(formData, "addressLine2"),
    suburb: value(formData, "suburb"),
    city: value(formData, "city"),
    province: value(formData, "province"),
    postalCode: value(formData, "postalCode", 20),
    country: value(formData, "country"),
    preferredLanguage: value(formData, "preferredLanguage", 80),
    emergencyContactName: value(formData, "emergencyContactName"),
    emergencyContactRelationship: value(formData, "emergencyContactRelationship", 100),
    emergencyContactPhone: value(formData, "emergencyContactPhone", 40),
  };
  const existing = await prisma.patient.findFirst({
    where: { id: session.userId, practiceId: session.practiceId },
    select: { id: true, smsRemindersEnabled: true },
  });
  if (!existing) throw new Error("Patient account not found.");

  await prisma.$transaction(async (tx) => {
    await tx.patient.update({
      where: { id: existing.id },
      data: { ...profile, smsRemindersEnabled },
    });
    if (smsRemindersEnabled && !existing.smsRemindersEnabled) {
      await refreshPatientAppointmentReminders(tx, session.userId, session.practiceId);
    } else if (!smsRemindersEnabled && existing.smsRemindersEnabled) {
      await tx.appointmentReminder.updateMany({
        where: {
          appointment: { is: { patientId: session.userId, practiceId: session.practiceId } },
          status: { in: [AppointmentReminderStatus.PENDING, AppointmentReminderStatus.PROCESSING, AppointmentReminderStatus.FAILED] },
        },
        data: { status: AppointmentReminderStatus.CANCELLED, nextAttemptAt: null, processingAt: null },
      });
    }
    await tx.auditLog.create({
      data: {
        practiceId: session.practiceId,
        actorId: session.userId,
        actorType: "PATIENT",
        action: "UPDATE",
        resourceType: "PATIENT_PROFILE",
        resourceId: session.userId,
        metadata: { smsRemindersEnabled },
      },
    });
  });

  revalidatePath("/portal/profile");
  revalidatePath("/portal/appointments");
  redirect("/portal/profile?updated=1");
}
