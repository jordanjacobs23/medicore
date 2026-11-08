import { prisma } from "@/lib/prisma";

type AuditSession = {
  userId: string;
  practiceId: string;
  userType: "STAFF" | "PATIENT";
};

type SensitiveRecordAccess = {
  action?: "READ" | "CREATE" | "UPDATE" | "DELETE";
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, string | number | boolean>;
};

export async function logSensitiveRecordAccess(
  session: AuditSession,
  {
    action = "READ",
    resourceType,
    resourceId,
    metadata,
  }: SensitiveRecordAccess,
) {
  await prisma.auditLog.create({
    data: {
      practiceId: session.practiceId,
      actorId: session.userId,
      actorType: session.userType,
      action,
      resourceType,
      resourceId,
      metadata,
    },
  });
}
