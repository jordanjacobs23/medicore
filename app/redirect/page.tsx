import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";

export const instant = false;

export default async function PostLoginPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/sign-in");
  }

  if (session.userType === "PATIENT") {
    redirect("/portal");
  }

  if (session.role === "PRACTICE_MANAGER") {
    redirect("/reports");
  }

  if (session.role === "RECEPTIONIST") {
    redirect("/calendar");
  }

  if (session.role === "BILLING_CLERK") {
    redirect("/billing");
  }

  redirect("/today");
}