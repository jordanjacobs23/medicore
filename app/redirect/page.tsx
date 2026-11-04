import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import type { StaffRole } from "@/components/clinical-core/src/rbac";

export const instant = false;

const STAFF_DASHBOARD: Record<StaffRole, string> = {
  PRACTICE_MANAGER: "/reports",
  PRACTITIONER: "/clinical",
  RECEPTIONIST: "/calendar",
  BILLING_CLERK: "/billing",
  NURSE: "/today",
  ASSISTANT: "/today",
  VIEWER: "/reports",
};

export default async function PostLoginPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/sign-in");
  }

  if (session.userType === "PATIENT") {
    redirect("/portal");
  }

  redirect(STAFF_DASHBOARD[session.role]);
}