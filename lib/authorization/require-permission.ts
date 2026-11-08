import { forbidden } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  Permission,
} from "@/components/clinical-core/src/rbac";

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
    session.userType !== "PATIENT" ||
    session.userId !== patientId
  ) {
    forbidden();
  }

  return session;
}

export async function requirePractitionerPatientAccess(patientId: string) {
  const session = await requirePermission("patient:read");

  if (session.role !== "PRACTITIONER") {
    return session;
  }

  const activeBreakGlassAccess = await prisma.breakGlassRequest.findFirst({
    where: {
      practiceId: session.practiceId,
      requesterStaffId: session.userId,
      patientId,
      status: "APPROVED",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (activeBreakGlassAccess) {
    return session;
  }

  const assignedPatient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      practiceId: session.practiceId,
      OR: [
        { appointments: { some: { practitionerId: session.userId } } },
        { encounters: { some: { practitionerId: session.userId } } },
        { prescriptions: { some: { practitionerId: session.userId } } },
      ],
    },
    select: { id: true },
  });

  if (!assignedPatient) {
    forbidden();
  }

  return session;
}
