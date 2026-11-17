"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

const allowedDurations = new Set([15, 20, 30, 45, 60]);

export async function savePractitionerSchedule(formData: FormData) {
  const session = await requirePermission("staff:*");
  const practitionerId = String(formData.get("practitionerId") ?? "");
  const practitioner = await prisma.staff.findFirst({
    where: {
      id: practitionerId,
      practiceId: session.practiceId,
      role: "PRACTITIONER",
      isActive: true,
    },
    select: { id: true },
  });
  if (!practitioner) throw new Error("Choose an active practitioner from this practice.");

  const schedules: {
    practiceId: string;
    practitionerId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
  }[] = [];
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    if (formData.get(`enabled-${dayOfWeek}`) !== "on") continue;
    const startTime = String(formData.get(`start-${dayOfWeek}`) ?? "");
    const endTime = String(formData.get(`end-${dayOfWeek}`) ?? "");
    const slotDurationMinutes = Number(formData.get(`duration-${dayOfWeek}`));
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime) || startTime >= endTime) {
      throw new Error("Each working day needs a valid start and end time.");
    }
    if (!allowedDurations.has(slotDurationMinutes)) {
      throw new Error("Choose an appointment length of 15, 20, 30, 45, or 60 minutes.");
    }
    schedules.push({
      practiceId: session.practiceId,
      practitionerId,
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.practitionerSchedule.deleteMany({ where: { practitionerId, practiceId: session.practiceId } });
    if (schedules.length > 0) {
      await tx.practitionerSchedule.createMany({ data: schedules });
    }
  });

  revalidatePath("/calendar");
  revalidatePath("/portal/appointments/book");
  revalidatePath("/practice/schedules");
  redirect(`/practice/schedules?practitionerId=${encodeURIComponent(practitionerId)}&saved=1`);
}
