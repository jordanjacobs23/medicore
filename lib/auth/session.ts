import { auth, clerkClient } from "@clerk/nextjs/server";
import type { User as ClerkUser } from "@clerk/backend";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

export async function claimPatientAccountFromInvitation() {
  const session = await auth();
  if (!session.userId) return null;
  const clerkUserId = session.userId;

  const linkedPatient = await prisma.patient.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (linkedPatient) return linkedPatient;

  const staffAccount = await prisma.staff.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (staffAccount) return null;

  let user: ClerkUser;
  try {
    const clerk = await clerkClient();
    user = await clerk.users.getUser(clerkUserId);
  } catch {
    return null;
  }

  const patientId = user.publicMetadata.medicorePatientId;
  const practiceId = user.publicMetadata.medicorePracticeId;
  if (typeof patientId !== "string" || typeof practiceId !== "string") {
    return null;
  }

  const invitedPatient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId,
      clerkId: null,
      clerkInvitationId: { not: null },
    },
    select: { email: true },
  });
  if (!invitedPatient) return null;

  const verifiedEmail = user.emailAddresses.find(
    (address) =>
      address.verification?.status === "verified" &&
      address.emailAddress.trim().toLowerCase() ===
        invitedPatient.email.trim().toLowerCase(),
  );
  if (!verifiedEmail) return null;

  try {
    const result = await prisma.patient.updateMany({
      where: {
        id: patientId,
        practiceId,
        clerkId: null,
        clerkInvitationId: { not: null },
        email: { equals: invitedPatient.email, mode: "insensitive" },
      },
      data: { clerkId: clerkUserId, clerkInvitationId: null },
    });

    if (result.count !== 1) {
      return prisma.patient.findUnique({ where: { clerkId: clerkUserId } });
    }
  } catch (error) {
    const linkedPatient = await prisma.patient.findUnique({
      where: { clerkId: clerkUserId },
    });
    if (linkedPatient) return linkedPatient;
    throw error;
  }
  return prisma.patient.findUnique({ where: { clerkId: clerkUserId } });
}

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
