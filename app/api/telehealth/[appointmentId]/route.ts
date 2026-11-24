import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { PATIENT_PURPOSE_CONSENT_VERSION } from "@/lib/patient-consents";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

async function appointmentForSession(session: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      practiceId: session.practiceId,
      kind: "TELEHEALTH",
      ...(session.userType === "PATIENT" ? { patientId: session.userId } : session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    include: {
      patient: { select: { id: true } },
      practitioner: { select: { id: true } },
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { appointmentId } = await params;
  const appointment = await appointmentForSession(session, appointmentId);
  if (!appointment || !appointment.practitioner) return NextResponse.json({ error: "Telehealth appointment not found." }, { status: 404 });

  const telehealth = await prisma.telehealthSession.findUnique({ where: { appointmentId } });
  return NextResponse.json({ appointment: { id: appointment.id, status: appointment.status, kind: appointment.kind }, session: telehealth });
}

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { appointmentId } = await params;
  const appointment = await appointmentForSession(session, appointmentId);
  if (!appointment || !appointment.practitioner) return NextResponse.json({ error: "Telehealth appointment not found." }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { action?: string };
  const action = body.action;
  if (!["join", "record-request", "record-start", "record-stop", "end"].includes(action ?? "")) {
    return NextResponse.json({ error: "Invalid telehealth action." }, { status: 400 });
  }

  if (session.userType === "PATIENT" && action !== "record-stop") {
    const telehealthConsent = await prisma.patientPurposeConsent.findFirst({
      where: { practiceId: session.practiceId, patientId: session.userId, purpose: "TELEHEALTH", scopeVersion: PATIENT_PURPOSE_CONSENT_VERSION },
      orderBy: { sequence: "desc" },
    });
    if (!telehealthConsent?.granted) return NextResponse.json({ error: "Active telehealth consent is required." }, { status: 403 });
  }

  if (action === "record-request" || action === "record-start") {
    const recordingConsent = await prisma.patientPurposeConsent.findFirst({
      where: { practiceId: session.practiceId, patientId: appointment.patientId, purpose: "RECORDING", scopeVersion: PATIENT_PURPOSE_CONSENT_VERSION },
      orderBy: { sequence: "desc" },
    });
    if (!recordingConsent?.granted) return NextResponse.json({ error: "Active consultation recording consent is required." }, { status: 403 });
  }

  const now = new Date();
  const existing = await prisma.telehealthSession.findUnique({ where: { appointmentId } });
  let telehealth;
  if (action === "join") {
    telehealth = existing ?? await prisma.telehealthSession.create({
      data: {
        practiceId: session.practiceId,
        appointmentId,
        patientId: appointment.patientId,
        practitionerId: appointment.practitioner.id,
        status: "IN_PROGRESS",
        patientConsentAt: now,
      },
    });
    if (existing) telehealth = await prisma.telehealthSession.update({ where: { id: existing.id }, data: { status: "IN_PROGRESS" } });
  } else if (action === "record-request") {
    telehealth = await prisma.telehealthSession.upsert({
      where: { appointmentId },
      create: { practiceId: session.practiceId, appointmentId, patientId: appointment.patientId, practitionerId: appointment.practitioner.id, recordingStatus: "CONSENT_PENDING", recordingConsentAt: now },
      update: { recordingStatus: "CONSENT_PENDING", recordingConsentAt: now },
    });
  } else if (action === "record-start") {
    telehealth = await prisma.telehealthSession.update({
      where: { appointmentId },
      data: { recordingStatus: "RECORDING", recordingStartedAt: now, recordingConsentAt: now },
    });
  } else if (action === "record-stop") {
    telehealth = await prisma.telehealthSession.update({
      where: { appointmentId },
      data: { recordingStatus: "STOPPED", recordingEndedAt: now },
    });
  } else {
    telehealth = await prisma.telehealthSession.upsert({
      where: { appointmentId },
      create: { practiceId: session.practiceId, appointmentId, patientId: appointment.patientId, practitionerId: appointment.practitioner.id, status: "ENDED", endedAt: now },
      update: { status: "ENDED", endedAt: now },
    });
  }

  await logSensitiveRecordAccess(session, {
    action: action === "end" ? "UPDATE" : "CREATE",
    resourceType: "TELEHEALTH_SESSION",
    resourceId: telehealth.id,
    metadata: { appointmentId, telehealthAction: action ?? "unknown" },
  });
  return NextResponse.json({ session: telehealth });
}
