import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.ARRIVED,
  AppointmentStatus.IN_PROGRESS,
];

type AppointmentDatabase = typeof prisma | Prisma.TransactionClient;

export type AvailableSlot = {
  time: string;
  scheduledAt: Date;
  durationMinutes: number;
};

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function getLocalDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error("Choose a valid date.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Choose a valid date.");
  }
  return [year, month, day] as const;
}

export function dateTimeInTimeZone(dateKey: string, time: string, timeZone: string) {
  const [year, month, day] = parseDateKey(dateKey);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!timeMatch) throw new Error("Choose a valid appointment time.");
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) throw new Error("Choose a valid appointment time.");

  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = targetAsUtc;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
    );
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    const adjustment = targetAsUtc - representedAsUtc;
    timestamp += adjustment;
    if (adjustment === 0) break;
  }

  const result = new Date(timestamp);
  const localDate = getLocalDateKey(result, timeZone);
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(result);
  if (localDate !== dateKey || localTime !== time) {
    throw new Error("That local time does not exist. Choose another slot.");
  }
  return result;
}

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeFromMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function weekdayFromDateKey(dateKey: string) {
  const [year, month, day] = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export async function getAvailableSlots({
  practiceId,
  practitionerId,
  dateKey,
  timeZone,
  ignoreAppointmentId,
}: {
  practiceId: string;
  practitionerId: string;
  dateKey: string;
  timeZone: string;
  ignoreAppointmentId?: string;
}): Promise<AvailableSlot[]> {
  const weekday = weekdayFromDateKey(dateKey);
  const schedule = await prisma.practitionerSchedule.findUnique({
    where: { practitionerId_dayOfWeek: { practitionerId, dayOfWeek: weekday } },
    select: { practiceId: true, startTime: true, endTime: true, slotDurationMinutes: true },
  });
  if (!schedule || schedule.practiceId !== practiceId) return [];
  if (
    !/^\d{2}:\d{2}$/.test(schedule.startTime) ||
    !/^\d{2}:\d{2}$/.test(schedule.endTime) ||
    schedule.slotDurationMinutes <= 0
  ) return [];

  const startOfDay = dateTimeInTimeZone(dateKey, "00:00", timeZone);
  const endOfDay = dateTimeInTimeZone(addDaysToDateKey(dateKey, 1), "00:00", timeZone);
  const possibleSlots: AvailableSlot[] = [];
  const startMinutes = minutesFromTime(schedule.startTime);
  const endMinutes = minutesFromTime(schedule.endTime);
  const now = new Date();
  for (
    let minute = startMinutes;
    minute + schedule.slotDurationMinutes <= endMinutes;
    minute += schedule.slotDurationMinutes
  ) {
    const time = timeFromMinutes(minute);
    let scheduledAt: Date;
    try {
      scheduledAt = dateTimeInTimeZone(dateKey, time, timeZone);
    } catch {
      // Skip wall-clock times that do not exist during a daylight-saving transition.
      continue;
    }
    if (scheduledAt <= now) continue;
    possibleSlots.push({ time, scheduledAt, durationMinutes: schedule.slotDurationMinutes });
  }

  if (possibleSlots.length === 0) return [];
  const appointments = await prisma.appointment.findMany({
    where: {
      practiceId,
      practitionerId,
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      scheduledAt: {
        gte: new Date(startOfDay.getTime() - 4 * 60 * 60 * 1000),
        lt: endOfDay,
      },
    },
    select: { scheduledAt: true, durationMinutes: true },
  });

  return possibleSlots.filter((slot) => {
    const slotEnd = slot.scheduledAt.getTime() + slot.durationMinutes * 60_000;
    return !appointments.some((appointment) => {
      const appointmentEnd = appointment.scheduledAt.getTime() + appointment.durationMinutes * 60_000;
      return appointment.scheduledAt.getTime() < slotEnd && appointmentEnd > slot.scheduledAt.getTime();
    });
  });
}

export async function assertAvailableSlot({
  db,
  practiceId,
  practitionerId,
  dateKey,
  time,
  timeZone,
  ignoreAppointmentId,
}: {
  db: AppointmentDatabase;
  practiceId: string;
  practitionerId: string;
  dateKey: string;
  time: string;
  timeZone: string;
  ignoreAppointmentId?: string;
}): Promise<AvailableSlot> {
  const weekday = weekdayFromDateKey(dateKey);
  const schedule = await db.practitionerSchedule.findUnique({
    where: { practitionerId_dayOfWeek: { practitionerId, dayOfWeek: weekday } },
    select: { practiceId: true, startTime: true, endTime: true, slotDurationMinutes: true },
  });
  if (!schedule || schedule.practiceId !== practiceId) {
    throw new Error("This practitioner does not have a schedule on that day.");
  }

  const minute = minutesFromTime(time);
  const startMinutes = minutesFromTime(schedule.startTime);
  const endMinutes = minutesFromTime(schedule.endTime);
  if (
    minute < startMinutes ||
    minute + schedule.slotDurationMinutes > endMinutes ||
    (minute - startMinutes) % schedule.slotDurationMinutes !== 0
  ) {
    throw new Error("Choose a time from the practitioner's available slots.");
  }

  const scheduledAt = dateTimeInTimeZone(dateKey, time, timeZone);
  if (scheduledAt <= new Date()) throw new Error("Appointments must be booked for a future time.");
  const slotEnd = new Date(scheduledAt.getTime() + schedule.slotDurationMinutes * 60_000);
  const conflicts = await db.appointment.findMany({
    where: {
      practiceId,
      practitionerId,
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      scheduledAt: {
        gte: new Date(scheduledAt.getTime() - 4 * 60 * 60 * 1000),
        lt: slotEnd,
      },
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
  const hasConflict = conflicts.some((conflict) => {
    const conflictEnd = conflict.scheduledAt.getTime() + conflict.durationMinutes * 60_000;
    return conflict.scheduledAt < slotEnd && conflictEnd > scheduledAt.getTime();
  });
  if (hasConflict) {
    throw new Error("That slot was just booked. Choose another available time.");
  }

  return { time, scheduledAt, durationMinutes: schedule.slotDurationMinutes };
}

