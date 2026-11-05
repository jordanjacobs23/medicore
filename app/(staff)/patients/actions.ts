"use server";

import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

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