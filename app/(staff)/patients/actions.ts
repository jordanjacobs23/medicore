"use server";

import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export async function createPatient(input: {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  const session = await requirePermission("patient:create");

  return prisma.patient.create({
    data: {
      practiceId: session.practiceId,
      ...input,
    },
  });
}