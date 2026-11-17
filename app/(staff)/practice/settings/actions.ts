"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { isValidTimeZone } from "@/lib/appointments/availability";

export async function updatePracticeSettings(formData: FormData) {
  const session = await requirePermission("staff:*");
  const name = String(formData.get("name") ?? "").trim();
  const timeZone = String(formData.get("timeZone") ?? "").trim();

  if (!name) {
    throw new Error("Practice name is required.");
  }
  if (!isValidTimeZone(timeZone)) {
    throw new Error("Enter a valid IANA time zone, such as Africa/Johannesburg.");
  }

  const practice = await prisma.practice.findUnique({
    where: { id: session.practiceId },
    select: { clerkOrgId: true },
  });

  if (!practice) {
    throw new Error("Practice not found.");
  }

  const clerk = await clerkClient();
  await clerk.organizations.updateOrganization(practice.clerkOrgId, { name });
  await prisma.practice.update({
    where: { id: session.practiceId },
    data: { name, timeZone },
  });

  redirect("/practice/settings?saved=1");
}
