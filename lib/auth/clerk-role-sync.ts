import { StaffRole } from "@prisma/client";

const CLERK_ROLE_MAP = {
  "org:practice_manager": "PRACTICE_MANAGER",
  "org:practitioner": "PRACTITIONER",
  "org:receptionist": "RECEPTIONIST",
  "org:billing_clerk": "BILLING_CLERK",
  "org:nurse": "NURSE",
  "org:assistant": "ASSISTANT",
  "org:viewer": "VIEWER",
} satisfies Record<string, StaffRole>;

export function getStaffRole(
  clerkRole: string | null | undefined,
): StaffRole | null {
  return CLERK_ROLE_MAP[
    clerkRole as keyof typeof CLERK_ROLE_MAP
  ] ?? null;
}