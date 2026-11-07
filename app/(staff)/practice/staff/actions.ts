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
  const invitations = await clerk.organizations.getOrganizationInvitationList({
    organizationId: practice.clerkOrgId,
    status: ["pending"],
  });
  if (!invitations.data.some((invitation) => invitation.id === invitationId)) {
    throw new Error("Invitation not found in this practice.");
  }

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

export async function assignStaffRole(staffId: string, formData: FormData) {
  const session = await requirePermission("staff:*");
  const role = String(formData.get("role") ?? "") as keyof typeof ROLE_MAP;

  if (!ROLE_MAP[role]) {
    throw new Error("A valid staff role is required.");
  }

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, practiceId: session.practiceId, isActive: true },
    include: { practice: { select: { clerkOrgId: true } } },
  });

  if (!staff) {
    throw new Error("Staff member not found.");
  }

  if (staff.role === "PRACTICE_MANAGER" && role !== "PRACTICE_MANAGER") {
    const managerCount = await prisma.staff.count({
      where: {
        practiceId: session.practiceId,
        isActive: true,
        role: "PRACTICE_MANAGER",
      },
    });

    if (managerCount <= 1) {
      throw new Error("Assign another practice manager before changing this member's role.");
    }
  }

  const clerk = await clerkClient();
  await clerk.organizations.updateOrganizationMembership({
    organizationId: staff.practice.clerkOrgId,
    userId: staff.clerkId,
    role: ROLE_MAP[role],
  });
  await prisma.staff.update({
    where: { id: staff.id },
    data: { role },
  });

  redirect("/practice/staff?roleUpdated=1");
}

export async function deactivateStaff(staffId: string) {
  const session = await requirePermission("staff:*");

  if (staffId === session.userId) {
    throw new Error("You cannot deactivate your own account.");
  }

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, practiceId: session.practiceId },
    include: { practice: { select: { clerkOrgId: true } } },
  });

  if (!staff) {
    throw new Error("Staff member not found.");
  }

  if (!staff.isActive) {
    redirect("/practice/staff?deactivated=1");
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

  redirect("/practice/staff?deactivated=1");
}

export async function activateStaff(staffId: string) {
  const session = await requirePermission("staff:*");
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, practiceId: session.practiceId },
    include: { practice: { select: { clerkOrgId: true } } },
  });

  if (!staff) {
    throw new Error("Staff member not found.");
  }

  if (staff.isActive) {
    redirect("/practice/staff?activated=1");
  }

  const clerk = await clerkClient();
  const memberships = await clerk.organizations.getOrganizationMembershipList({
    organizationId: staff.practice.clerkOrgId,
    userId: [staff.clerkId],
  });
  if (memberships.data.length === 0) {
    await clerk.organizations.createOrganizationMembership({
      organizationId: staff.practice.clerkOrgId,
      userId: staff.clerkId,
      role: ROLE_MAP[staff.role],
    });
  } else {
    await clerk.organizations.updateOrganizationMembership({
      organizationId: staff.practice.clerkOrgId,
      userId: staff.clerkId,
      role: ROLE_MAP[staff.role],
    });
  }
  await prisma.staff.update({
    where: { id: staff.id },
    data: { isActive: true },
  });

  redirect("/practice/staff?activated=1");
}
