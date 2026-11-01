import { forbidden } from "next/navigation";
import { getSessionContext } from "./session";
import { hasPermission, Permission } from "@/components/clinical-core/src/rbac";

export async function requirePermission(permission: Permission) {
  const session = await getSessionContext();

  if (!session || session.userType !== "STAFF") {
    forbidden();
  }

  if (!hasPermission(session.role, permission)) {
    forbidden();
  }

  return session;
}

export async function requirePatientSelfAccess(patientId: string) {
  const session = await getSessionContext();

  if (!session) {
    forbidden();
  }

  if (
    session.userType === "PATIENT" &&
    session.userId !== patientId
  ) {
    forbidden();
  }

  return session;
}