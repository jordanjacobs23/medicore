import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getSessionContext = cache(async () => {
  const session = await auth();

  if (!session.userId) {
    return null;
  }

  const staff = await prisma.staff.findFirst({
    where: {
      clerkId: session.userId,
      isActive: true,
    },
  });

  if (staff) {
    if (session.orgId) {
      const activePractice = await prisma.practice.findUnique({
        where: { clerkOrgId: session.orgId },
        select: { id: true },
      });

      if (!activePractice || activePractice.id !== staff.practiceId) {
        return null;
      }
    } else {
      return null;
    }

    return {
      clerkId: session.userId,
      userId: staff.id,
      practiceId: staff.practiceId,
      role: staff.role,
      userType: "STAFF" as const,
    };
  }

  const patient = await prisma.patient.findUnique({
    where: { clerkId: session.userId },
  });

  if (patient) {
    return {
      clerkId: session.userId,
      userId: patient.id,
      practiceId: patient.practiceId,
      role: "PATIENT" as const,
      userType: "PATIENT" as const,
    };
  }

  return null;
});