import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { PATIENT_PURPOSE_CONSENT_VERSION } from "@/lib/patient-consents";
import { prisma } from "@/lib/prisma";
import { TelehealthRoom } from "@/components/telehealth-room";
import { Suspense } from "react";

async function TelehealthContent({ params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await getSessionContext();
  if (!session) redirect("/sign-in");
  const { appointmentId } = await params;
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      practiceId: session.practiceId,
      kind: "TELEHEALTH",
      ...(session.userType === "PATIENT" ? { patientId: session.userId } : session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    include: {
      patient: { select: { id: true, clerkId: true } },
      practitioner: { select: { id: true, clerkId: true } },
    },
  });
  if (!appointment || !appointment.practitioner) notFound();

  let telehealthConsent = true;
  let recordingConsent = true;
  if (session.userType === "PATIENT") {
    const consents = await prisma.patientPurposeConsent.findMany({
      where: {
        practiceId: session.practiceId,
        patientId: session.userId,
        purpose: { in: ["TELEHEALTH", "RECORDING"] },
        scopeVersion: PATIENT_PURPOSE_CONSENT_VERSION,
      },
      orderBy: { sequence: "desc" },
    });
    telehealthConsent = consents.some((consent) => consent.purpose === "TELEHEALTH" && consent.granted);
    recordingConsent = consents.some((consent) => consent.purpose === "RECORDING" && consent.granted);
  }

  if (!telehealthConsent) {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-5 pt-28">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h1 className="font-montserrat text-2xl font-bold">Telehealth consent required</h1>
          <p className="mt-2 text-sm">Grant the Telehealth purpose consent in your patient profile before joining this consultation.</p>
        </section>
      </main>
    );
  }

  const targetClerkId = session.userType === "PATIENT"
    ? appointment.practitioner.clerkId
    : appointment.patient.clerkId;
  if (!targetClerkId) notFound();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6">
      <TelehealthRoom
        appointmentId={appointmentId}
        targetClerkId={targetClerkId}
        role={session.userType === "PATIENT" ? "patient" : "practitioner"}
        recordingConsent={recordingConsent}
      />
    </main>
  );
}

export default function TelehealthPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-6 text-white">Loading telehealth room...</main>}>
      <TelehealthContent params={params} />
    </Suspense>
  );
}
