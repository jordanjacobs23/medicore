"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

const ROLE_MAP = {
  PRACTICE_MANAGER: "org:practice_manager",
  PRACTITIONER: "org:practitioner",
  RECEPTIONIST: "org:receptionist",
  BILLING_CLERK: "org:billing_clerk",
  NURSE: "org:nurse",
  ASSISTANT: "org:assistant",
  VIEWER: "org:viewer",
} as const;

export async function inviteStaff(formData: FormData) {
  const session = await requirePermission("staff:*");
  const emailAddress = String(formData.get("emailAddress") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as keyof typeof ROLE_MAP;

  if (!emailAddress || !ROLE_MAP[role]) {
    throw new Error("A valid email address and role are required.");
  }

  const practice = await prisma.practice.findUnique({
    where: { id: session.practiceId },
    select: { clerkOrgId: true },
  });

  if (!practice) {
    throw new Error("Practice not found.");
  }

  const existing = await prisma.staff.findFirst({
    where: {
      practiceId: session.practiceId,
      email: { equals: emailAddress, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error("This email already belongs to a staff member in your practice.");
  }

  const clerk = await clerkClient();
  await clerk.organizations.createOrganizationInvitation({
    organizationId: practice.clerkOrgId,
    emailAddress,
    role: ROLE_MAP[role],
    expiresInDays: 7,
    inviterUserId: session.clerkId,
    redirectUrl: "/redirect",
  });

  redirect("/practice/staff?invited=1");
}

export async function revokeStaffInvitation(invitationId: string) {
  const session = await requirePermission("staff:*");
  const practice = await prisma.practice.findUnique({
    where: { id: session.practiceId },
    select: { clerkOrgId: true },
  });

  if (!practice) {
    throw new Error("Practice not found.");
  }

  const clerk = await clerkClient();
  await clerk.organizations.revokeOrganizationInvitation({
    organizationId: practice.clerkOrgId,
    invitationId,
    requestingUserId: session.clerkId,
  });

  revalidatePath("/practice/staff");
}

export async function removeStaff(staffId: string) {
  const session = await requirePermission("staff:*");

  if (staffId === session.userId) {
    throw new Error("You cannot remove your own account from the practice.");
  }

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, practiceId: session.practiceId },
    include: { practice: { select: { clerkOrgId: true } } },
  });

  if (!staff) {
    throw new Error("Staff member not found.");
  }

  const clerk = await clerkClient();
  await clerk.organizations.deleteOrganizationMembership({
    organizationId: staff.practice.clerkOrgId,
    userId: staff.clerkId,
  });
  await prisma.staff.update({
    where: { id: staff.id },
    data: { isActive: false },
  });

  redirect("/practice/staff?removed=1");
}
