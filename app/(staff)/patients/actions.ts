"use server";

import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

export type PatientUpdateState = {
  success: string | null;
  error: string | null;
};

export async function createPatient(formData: FormData) {
  const session = await requirePermission("patient:create");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!firstName || !lastName || !email) {
    throw new Error("First name, last name, and email are required.");
  }

  await prisma.patient.create({
    data: {
      practiceId: session.practiceId,
      clerkId: `test_patient_${randomUUID()}`,
      firstName,
      lastName,
      email,
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

  if (!firstName || !lastName || !email) {
    return { success: null, error: "First name, last name, and email are required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: null, error: "Enter a valid email address." };
  }

  const result = await prisma.patient.updateMany({
    where: { id: patientId, practiceId: session.practiceId },
    data: { firstName, lastName, email },
  });

  if (result.count !== 1) {
    return { success: null, error: "Patient not found." };
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");

  return { success: "Personal information updated.", error: null };
}