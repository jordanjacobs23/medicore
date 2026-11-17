CREATE TYPE "AppointmentReminderKind" AS ENUM ('DAY_BEFORE', 'TWO_HOURS_BEFORE');
CREATE TYPE "AppointmentReminderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

ALTER TABLE "Practice"
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg';

ALTER TABLE "Patient"
ADD COLUMN "smsRemindersEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Appointment"
ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 30;

CREATE TABLE "PractitionerSchedule" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PractitionerSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentReminder" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" "AppointmentReminderKind" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentReminderStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PractitionerSchedule_practitionerId_dayOfWeek_key" ON "PractitionerSchedule"("practitionerId", "dayOfWeek");
CREATE INDEX "PractitionerSchedule_practiceId_practitionerId_dayOfWeek_idx" ON "PractitionerSchedule"("practiceId", "practitionerId", "dayOfWeek");
CREATE INDEX "Appointment_practiceId_scheduledAt_idx" ON "Appointment"("practiceId", "scheduledAt");
CREATE INDEX "Appointment_practitionerId_scheduledAt_idx" ON "Appointment"("practitionerId", "scheduledAt");
CREATE UNIQUE INDEX "AppointmentReminder_appointmentId_kind_key" ON "AppointmentReminder"("appointmentId", "kind");
CREATE INDEX "AppointmentReminder_status_scheduledFor_idx" ON "AppointmentReminder"("status", "scheduledFor");
CREATE INDEX "AppointmentReminder_status_nextAttemptAt_idx" ON "AppointmentReminder"("status", "nextAttemptAt");

ALTER TABLE "PractitionerSchedule" ADD CONSTRAINT "PractitionerSchedule_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PractitionerSchedule" ADD CONSTRAINT "PractitionerSchedule_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
