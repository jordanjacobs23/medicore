import {
  AppointmentReminderKind,
  AppointmentReminderStatus,
  AppointmentStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ReminderDatabase = Prisma.TransactionClient;

const reminderOffsets: Record<AppointmentReminderKind, number> = {
  DAY_BEFORE: 24 * 60 * 60 * 1000,
  TWO_HOURS_BEFORE: 2 * 60 * 60 * 1000,
};

export async function syncAppointmentReminders(
  db: ReminderDatabase,
  appointmentId: string,
  scheduledAt: Date,
) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      status: true,
      patient: { select: { phone: true, smsRemindersEnabled: true } },
    },
  });
  if (!appointment) return;

  const eligible =
    appointment.status === AppointmentStatus.BOOKED &&
    appointment.patient.smsRemindersEnabled &&
    Boolean(appointment.patient.phone?.trim());
  const now = new Date();
  for (const [kind, offset] of Object.entries(reminderOffsets) as [AppointmentReminderKind, number][]) {
    const reminderAt = new Date(scheduledAt.getTime() - offset);
    const isPending = eligible && reminderAt > now;
    const existing = await db.appointmentReminder.findUnique({
      where: { appointmentId_kind: { appointmentId, kind } },
      select: { status: true, scheduledFor: true },
    });
    if (
      existing?.status === AppointmentReminderStatus.SENT &&
      existing.scheduledFor.getTime() === reminderAt.getTime()
    ) {
      continue;
    }
    const data = {
      scheduledFor: reminderAt,
      status: isPending ? AppointmentReminderStatus.PENDING : AppointmentReminderStatus.CANCELLED,
      attempts: 0,
      nextAttemptAt: null,
      processingAt: null,
      sentAt: null,
      lastError: null,
    };
    await db.appointmentReminder.upsert({
      where: { appointmentId_kind: { appointmentId, kind } },
      create: { appointmentId, kind, ...data },
      update: data,
    });
  }
}

export async function refreshPatientAppointmentReminders(
  db: ReminderDatabase,
  patientId: string,
  practiceId: string,
) {
  const appointments = await db.appointment.findMany({
    where: {
      patientId,
      practiceId,
      status: AppointmentStatus.BOOKED,
      scheduledAt: { gt: new Date() },
    },
    select: { id: true, scheduledAt: true },
  });
  for (const appointment of appointments) {
    await syncAppointmentReminders(db, appointment.id, appointment.scheduledAt);
  }
}

export async function cancelPendingAppointmentReminders(
  db: ReminderDatabase,
  appointmentId: string,
) {
  await db.appointmentReminder.updateMany({
    where: {
      appointmentId,
      status: {
        in: [
          AppointmentReminderStatus.PENDING,
          AppointmentReminderStatus.PROCESSING,
          AppointmentReminderStatus.FAILED,
        ],
      },
    },
    data: {
      status: AppointmentReminderStatus.CANCELLED,
      nextAttemptAt: null,
      processingAt: null,
    },
  });
}

export async function sendAppointmentReminder({
  to,
  practiceName,
  scheduledAt,
  timeZone,
}: {
  to: string;
  practiceName: string;
  scheduledAt: Date;
  timeZone: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("SMS provider is not configured.");
  }
  const normalizedTo = to.replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalizedTo)) {
    throw new Error("Patient phone number must use international format, such as +27123456789.");
  }

  const date = new Intl.DateTimeFormat("en-ZA", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(scheduledAt);
  const time = new Intl.DateTimeFormat("en-ZA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(scheduledAt);
  const body = `Appointment reminder from ${practiceName}: your visit is on ${date} at ${time}. Please contact the practice if you need to make a change.`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: normalizedTo, From: fromNumber, Body: body }).toString(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`SMS provider returned ${response.status}: ${details}`);
  }
}

export async function processDueAppointmentReminders() {
  const now = new Date();
  const staleProcessingBefore = new Date(now.getTime() - 15 * 60 * 1000);
  await prisma.appointmentReminder.updateMany({
    where: {
      status: AppointmentReminderStatus.PROCESSING,
      processingAt: { lt: staleProcessingBefore },
    },
    data: {
      status: AppointmentReminderStatus.FAILED,
      processingAt: null,
      nextAttemptAt: now,
      lastError: "Previous reminder attempt did not finish.",
    },
  });

  const due = await prisma.appointmentReminder.findMany({
    where: {
      OR: [
        { status: AppointmentReminderStatus.PENDING, scheduledFor: { lte: now } },
        {
          status: AppointmentReminderStatus.FAILED,
          attempts: { lt: 3 },
          nextAttemptAt: { lte: now },
        },
      ],
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    take: 30,
    select: { id: true, status: true },
  });

  let sent = 0;
  let failed = 0;
  let cancelled = 0;
  for (const candidate of due) {
    const claim = await prisma.appointmentReminder.updateMany({
      where: {
        id: candidate.id,
        status: candidate.status,
        ...(candidate.status === AppointmentReminderStatus.PENDING
          ? { scheduledFor: { lte: now } }
          : { attempts: { lt: 3 }, nextAttemptAt: { lte: now } }),
      },
      data: {
        status: AppointmentReminderStatus.PROCESSING,
        processingAt: now,
        attempts: { increment: 1 },
        nextAttemptAt: null,
      },
    });
    if (claim.count !== 1) continue;

    const reminder = await prisma.appointmentReminder.findUnique({
      where: { id: candidate.id },
      include: {
        appointment: {
          include: {
            practice: { select: { name: true, timeZone: true } },
            patient: { select: { phone: true, smsRemindersEnabled: true } },
          },
        },
      },
    });
    if (
      !reminder ||
      reminder.appointment.status !== AppointmentStatus.BOOKED ||
      !reminder.appointment.patient.smsRemindersEnabled ||
      !reminder.appointment.patient.phone?.trim()
    ) {
      if (reminder) {
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: { status: AppointmentReminderStatus.CANCELLED, processingAt: null },
        });
      }
      cancelled += 1;
      continue;
    }

    try {
      await sendAppointmentReminder({
        to: reminder.appointment.patient.phone,
        practiceName: reminder.appointment.practice.name,
        scheduledAt: reminder.appointment.scheduledAt,
        timeZone: reminder.appointment.practice.timeZone,
      });
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: AppointmentReminderStatus.SENT,
          sentAt: new Date(),
          processingAt: null,
          lastError: null,
        },
      });
      sent += 1;
    } catch (error) {
      const nextAttemptAt = reminder.attempts < 3
        ? new Date(Date.now() + reminder.attempts * 5 * 60 * 1000)
        : null;
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: AppointmentReminderStatus.FAILED,
          processingAt: null,
          nextAttemptAt,
          lastError: error instanceof Error ? error.message.slice(0, 1000) : "SMS delivery failed.",
        },
      });
      failed += 1;
    }
  }

  return { claimed: sent + failed + cancelled, sent, failed, cancelled };
}

