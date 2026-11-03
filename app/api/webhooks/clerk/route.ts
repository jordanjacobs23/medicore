import { clerkClient } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { StaffRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const CLERK_ROLE_MAP: Partial<Record<string, StaffRole>> = {
  "org:practice_manager": "PRACTICE_MANAGER",
  "org:practitioner": "PRACTITIONER",
  "org:receptionist": "RECEPTIONIST",
  "org:billing_clerk": "BILLING_CLERK",
  "org:nurse": "NURSE",
  "org:assistant": "ASSISTANT",
  "org:viewer": "VIEWER",
};

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === "organizationMembership.created" ||
        evt.type === "organizationMembership.updated") {
      const clerkUserId = evt.data.public_user_data.user_id;
      const clerkOrgId = evt.data.organization.id;
      const role = CLERK_ROLE_MAP[evt.data.role];

      const practice = await prisma.practice.findUnique({
        where: { clerkOrgId },
      });

      if (!practice) {
        console.error("Organization has no MediCore practice", {
          clerkOrgId,
        });
        return new Response("Practice not configured", { status: 422 });
      }

      if (!role) {
        console.error("Unknown Clerk organization role", {
          clerkRole: evt.data.role,
        });
        return new Response("Unsupported organization role", { status: 422 });
      }

      const clerk = await clerkClient();
      const user = await clerk.users.getUser(clerkUserId);
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        evt.data.public_user_data.identifier ??
        "";

      await prisma.staff.upsert({
        where: { clerkId: clerkUserId },
        create: {
          clerkId: clerkUserId,
          practiceId: practice.id,
          email,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          role,
          isActive: true,
        },
        update: {
          practiceId: practice.id,
          email,
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          role,
          isActive: true,
        },
      });
    }

    if (evt.type === "organizationMembership.deleted") {
      const clerkUserId = evt.data.public_user_data.user_id;

      await prisma.staff.updateMany({
        where: {
          clerkId: clerkUserId,
          practice: { clerkOrgId: evt.data.organization.id },
        },
        data: { isActive: false },
      });
    }

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error processing Clerk webhook:", err);
    return new Response("Webhook processing failed", { status: 500 });
  }
}