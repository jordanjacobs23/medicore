import { AppointmentReminderStatus, AppointmentStatus, Prisma } from "@prisma/client";
import { assertAvailableSlot } from "@/lib/appointments/availability";
import { refreshPatientAppointmentReminders, syncAppointmentReminders } from "@/lib/appointments/reminders";
import { prisma } from "@/lib/prisma";

function isSerializationConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function rethrowSlotConflict(error: unknown): never {
  if (isSerializationConflict(error)) {
    throw new Error("That slot was just booked. Choose another available time.");
  }
  throw error;
}

export async function createAppointmentInSlot({
  practiceId,
  patientId,
  practitionerId,
  dateKey,
  time,
  reason,
  smsRemindersEnabled,
  kind,
}: {
  practiceId: string;
  patientId: string;
  practitionerId: string;
  dateKey: string;
  time: string;
  reason: string | null;
  smsRemindersEnabled?: boolean;
  kind?: "IN_PERSON" | "TELEHEALTH";
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const [practice, patient, practitioner] = await Promise.all([
        tx.practice.findUnique({ where: { id: practiceId }, select: { timeZone: true } }),
        tx.patient.findFirst({ where: { id: patientId, practiceId }, select: { id: true, phone: true, smsRemindersEnabled: true } }),
        tx.staff.findFirst({
          where: { id: practitionerId, practiceId, role: "PRACTITIONER", isActive: true },
          select: { id: true },
        }),
      ]);
      if (!practice || !patient) throw new Error("Patient not found in this practice.");
      if (!practitioner) throw new Error("The selected practitioner is unavailable.");

      if (smsRemindersEnabled !== undefined) {
        const enableForExistingBookings = smsRemindersEnabled &&
          !patient.smsRemindersEnabled && Boolean(patient.phone?.trim());
        await tx.patient.update({
          where: { id: patientId },
          data: { smsRemindersEnabled: smsRemindersEnabled && Boolean(patient.phone?.trim()) },
        });
        if (!smsRemindersEnabled) {
          await tx.appointmentReminder.updateMany({
            where: {
              appointment: { is: { patientId, practiceId } },
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
        } else if (enableForExistingBookings) {
          await refreshPatientAppointmentReminders(tx, patientId, practiceId);
        }
      }

      const slot = await assertAvailableSlot({
        db: tx,
        practiceId,
        practitionerId,
        dateKey,
        time,
        timeZone: practice.timeZone,
      });
      const appointment = await tx.appointment.create({
        data: {
          practiceId,
          patientId,
          practitionerId,
          scheduledAt: slot.scheduledAt,
          durationMinutes: slot.durationMinutes,
          reason,
          status: AppointmentStatus.BOOKED,
          kind: kind ?? "IN_PERSON",
        },
        select: { id: true },
      });
      await syncAppointmentReminders(tx, appointment.id, slot.scheduledAt);
      return appointment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    rethrowSlotConflict(error);
  }
}

export async function rescheduleAppointmentInSlot({
  practiceId,
  appointmentId,
  patientId,
  currentPractitionerId,
  practitionerId,
  dateKey,
  time,
}: {
  practiceId: string;
  appointmentId: string;
  patientId?: string;
  currentPractitionerId?: string;
  practitionerId: string;
  dateKey: string;
  time: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: appointmentId,
          practiceId,
          ...(patientId ? { patientId } : {}),
          ...(currentPractitionerId ? { practitionerId: currentPractitionerId } : {}),
        },
        select: { id: true, status: true, scheduledAt: true },
      });
      if (!appointment) throw new Error("Appointment not found.");
      if (appointment.status !== AppointmentStatus.BOOKED || appointment.scheduledAt <= new Date()) {
        throw new Error("This appointment can no longer be rescheduled.");
      }

      const [practice, practitioner] = await Promise.all([
        tx.practice.findUnique({ where: { id: practiceId }, select: { timeZone: true } }),
        tx.staff.findFirst({
          where: { id: practitionerId, practiceId, role: "PRACTITIONER", isActive: true },
          select: { id: true },
        }),
      ]);
      if (!practice || !practitioner) throw new Error("The selected practitioner is unavailable.");

      const slot = await assertAvailableSlot({
        db: tx,
        practiceId,
        practitionerId,
        dateKey,
        time,
        timeZone: practice.timeZone,
        ignoreAppointmentId: appointment.id,
      });
      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          practitionerId,
          scheduledAt: slot.scheduledAt,
          durationMinutes: slot.durationMinutes,
        },
        select: { id: true },
      });
      await syncAppointmentReminders(tx, appointment.id, slot.scheduledAt);
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    rethrowSlotConflict(error);
  }
}
