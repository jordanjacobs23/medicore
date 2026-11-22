"use server";

import {
  requirePermission,
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import type { User as ClerkUser } from "@clerk/backend";

export type PatientUpdateState = {
  success: string | null;
  error: string | null;
};

export type PatientAccountLinkState = {
  success: string | null;
  error: string | null;
};

class PatientAccountLinkConflict extends Error {}

function parseDateOfBirth(value: string): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Enter a valid date of birth.");
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value > new Date().toISOString().slice(0, 10)
  ) {
    throw new Error("Enter a valid date of birth.");
  }

  return date;
}

export async function createPatient(formData: FormData) {
  const session = await requirePermission("patient:create");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const dateOfBirthValue = String(formData.get("dateOfBirth") ?? "").trim();

  if (!firstName || !lastName || !email) {
    throw new Error("First name, last name, and email are required.");
  }

  const dateOfBirth = parseDateOfBirth(dateOfBirthValue);

  await prisma.patient.create({
    data: {
      practiceId: session.practiceId,
      clerkId: null,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
    },
  });

  redirect("/patients");
}

export async function updatePatientPersonalInformation(
  patientId: string,
  _state: PatientUpdateState,
  formData: FormData,
): Promise<PatientUpdateState> {
  const session = await requirePermission("patient:update");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const dateOfBirthValue = String(formData.get("dateOfBirth") ?? "").trim();

  if (!firstName || !lastName || !email) {
    return { success: null, error: "First name, last name, and email are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: null, error: "Enter a valid email address." };
  }

  let dateOfBirth: Date | null;
  try {
    dateOfBirth = parseDateOfBirth(dateOfBirthValue);
  } catch (error) {
    if (error instanceof Error) {
      return { success: null, error: error.message };
    }
    throw error;
  }

  const result = await prisma.patient.updateMany({
    where: { id: patientId, practiceId: session.practiceId },
    data: { firstName, lastName, email, phone, dateOfBirth },
  });

  if (result.count !== 1) {
    return { success: null, error: "Patient not found." };
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");

  return { success: "Personal information updated.", error: null };
}

export async function connectPatientAccount(
  patientId: string,
  _state: PatientAccountLinkState,
  _formData: FormData,
): Promise<PatientAccountLinkState> {
  const session = await requirePermission("patient:connect_account");
  await requirePractitionerPatientAccess(patientId);

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: {
      id: true,
      email: true,
      clerkId: true,
      clerkInvitationId: true,
    },
  });

  if (!patient) {
    return { success: null, error: "Patient not found." };
  }
  if (patient.clerkId) {
    revalidatePath(`/patients/${patient.id}`);
    return { success: "A portal account is already connected.", error: null };
  }

  const email = patient.email.trim().toLowerCase();
  let clerk: Awaited<ReturnType<typeof clerkClient>>;
  let exactMatches: ClerkUser[];

  try {
    clerk = await clerkClient();
    const users = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 10,
    });
    exactMatches = users.data.filter((user) =>
      user.emailAddresses.some(
        (address) => address.emailAddress.trim().toLowerCase() === email,
      ),
    );
  } catch {
    return {
      success: null,
      error: "Couldn't check patient accounts right now. Please try again.",
    };
  }

  if (exactMatches.length > 1) {
    return {
      success: null,
      error: "More than one account uses this email. Contact your administrator.",
    };
  }

  const existingUser = exactMatches[0];
  if (existingUser) {
    const matchingEmail = existingUser.emailAddresses.find(
      (address) => address.emailAddress.trim().toLowerCase() === email,
    );

    if (matchingEmail?.verification?.status !== "verified") {
      return {
        success: null,
        error: "This account has not verified the patient's email address yet.",
      };
    }

    const [staffAccount, linkedPatient] = await Promise.all([
      prisma.staff.findUnique({
        where: { clerkId: existingUser.id },
        select: { id: true },
      }),
      prisma.patient.findUnique({
        where: { clerkId: existingUser.id },
        select: { id: true },
      }),
    ]);

    if (staffAccount) {
      return {
        success: null,
        error: "This email belongs to a staff account and cannot be linked as a patient.",
      };
    }
    if (linkedPatient && linkedPatient.id !== patient.id) {
      return {
        success: null,
        error: "This account is already connected to another patient record.",
      };
    }

    try {
      if (patient.clerkInvitationId) {
        await clerk.invitations
          .revokeInvitation(patient.clerkInvitationId)
          .catch(() => undefined);
      }

      await prisma.$transaction(async (tx) => {
        const updated = await tx.patient.updateMany({
          where: {
            id: patient.id,
            practiceId: session.practiceId,
            clerkId: null,
          },
          data: { clerkId: existingUser.id, clerkInvitationId: null },
        });
        if (updated.count !== 1) throw new PatientAccountLinkConflict();

        await tx.auditLog.create({
          data: {
            practiceId: session.practiceId,
            actorId: session.userId,
            actorType: "STAFF",
            action: "UPDATE",
            resourceType: "PATIENT_ACCOUNT",
            resourceId: patient.id,
            metadata: { operation: "LINK_EXISTING_ACCOUNT" },
          },
        });
      });
    } catch {
      return {
        success: null,
        error: "This patient record changed while you were connecting the account. Refresh and try again.",
      };
    }

    revalidatePath(`/patients/${patient.id}`);
    revalidatePath("/patients");
    return { success: "The existing portal account is now connected.", error: null };
  }

  try {
    if (patient.clerkInvitationId) {
      await clerk.invitations
        .revokeInvitation(patient.clerkInvitationId)
        .catch(() => undefined);
    }

    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      expiresInDays: 7,
      ignoreExisting: true,
      redirectUrl: "/redirect",
      publicMetadata: {
        medicorePatientId: patient.id,
        medicorePracticeId: session.practiceId,
      },
    });

    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.patient.updateMany({
          where: {
            id: patient.id,
            practiceId: session.practiceId,
            clerkId: null,
          },
          data: { clerkInvitationId: invitation.id },
        });
        if (updated.count !== 1) throw new PatientAccountLinkConflict();

        await tx.auditLog.create({
          data: {
            practiceId: session.practiceId,
            actorId: session.userId,
            actorType: "STAFF",
            action: "UPDATE",
            resourceType: "PATIENT_ACCOUNT",
            resourceId: patient.id,
            metadata: { operation: "SEND_PORTAL_INVITATION" },
          },
        });
      });
    } catch {
      await clerk.invitations.revokeInvitation(invitation.id).catch(() => undefined);
      return {
        success: null,
        error: "This patient record changed while you were sending the invitation. Refresh and try again.",
      };
    }
  } catch {
    return {
      success: null,
      error: "Couldn't send the patient portal invitation. Please try again.",
    };
  }

  revalidatePath(`/patients/${patient.id}`);
  revalidatePath("/patients");
  return {
    success: `A portal invitation was sent to ${email}. The account will connect when the patient accepts it.`,
    error: null,
  };
}
