import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { appointmentId } = await params;
  const telehealth = await prisma.telehealthSession.findUnique({
    where: { appointmentId },
    select: { id: true, practiceId: true, patientId: true, practitionerId: true },
  });
  if (!telehealth || telehealth.practiceId !== session.practiceId) return NextResponse.json({ error: "Telehealth session not found." }, { status: 404 });
  if (session.userType !== "PATIENT" && session.userId !== telehealth.practitionerId) return NextResponse.json({ error: "Not authorized for this session." }, { status: 403 });
  if (session.userType === "PATIENT" && session.userId !== telehealth.patientId) return NextResponse.json({ error: "Not authorized for this session." }, { status: 403 });

  const signals = await prisma.telehealthSignal.findMany({
    where: { sessionId: telehealth.id, targetId: session.clerkId },
    orderBy: { createdAt: "asc" },
  });
  if (signals.length) {
    await prisma.telehealthSignal.deleteMany({ where: { id: { in: signals.map((signal) => signal.id) } } });
  }
  return NextResponse.json({ signals: signals.map((signal) => ({ id: signal.id, kind: signal.kind, payload: signal.payload, senderId: signal.senderId })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { appointmentId } = await params;
  const telehealth = await prisma.telehealthSession.findUnique({
    where: { appointmentId },
    select: { id: true, practiceId: true, patientId: true, practitionerId: true },
  });
  if (!telehealth || telehealth.practiceId !== session.practiceId) return NextResponse.json({ error: "Telehealth session not found." }, { status: 404 });

  const body = await request.json() as { kind?: string; payload?: unknown; targetClerkId?: string };
  if (!body.kind || !body.targetClerkId || !["offer", "answer", "ice"].includes(body.kind)) {
    return NextResponse.json({ error: "A valid signal kind and target are required." }, { status: 400 });
  }
  const signal = await prisma.telehealthSignal.create({
    data: {
      sessionId: telehealth.id,
      senderId: session.clerkId,
      targetId: body.targetClerkId,
      kind: body.kind,
      payload: body.payload as object,
    },
  });
  return NextResponse.json({ id: signal.id });
}
