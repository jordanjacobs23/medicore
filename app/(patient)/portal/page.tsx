import { requirePatientSelfAccess } from "@/lib/authorization/require-permission";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarDays, CalendarPlus, FileText, MessageSquare, ReceiptText } from "lucide-react";

export default async function PatientPortalPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return null;
  }
  await requirePatientSelfAccess(session.userId);
  const [patient, appointments, prescriptions] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: session.userId, practiceId: session.practiceId },
    }),
    prisma.appointment.findMany({
      where: {
        patientId: session.userId,
        practiceId: session.practiceId,
      },
      orderBy: { scheduledAt: "desc" },
      take: 10,
    }),
    prisma.prescription.findMany({
      where: {
        patientId: session.userId,
        encounter: { practiceId: session.practiceId },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!patient) {
    return null;
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Patient portal</h1>
      <p className="mt-2 text-slate-500">
        Welcome, {patient.firstName} {patient.lastName}
      </p>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/portal/appointments" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <CalendarDays className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Appointments</p>
        </Link>
        <Link href="/portal/invoices" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <ReceiptText className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Invoices</p>
        </Link>
        <Link href="/portal/documents" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <FileText className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Documents</p>
        </Link>
        <Link href="/portal/messages" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <MessageSquare className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Messages</p>
        </Link>
      </section>
      <section className="mt-8 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold">Appointments</h2>
          <Link href="/portal/appointments/book" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#397f99] px-3 text-sm font-semibold text-white">
            <CalendarPlus className="size-4" />
            Book
          </Link>
        </div>
        {appointments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No appointments recorded.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="text-sm">
                {appointment.scheduledAt.toLocaleString()} - {appointment.status}
              </li>
            ))}
          </ul>
        )}
        <Link href="/portal/appointments" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#397f99]">
          <CalendarDays className="size-4" />
          Manage Appointments
        </Link>
      </section>
      <section className="mt-4 rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold">Prescriptions</h2>
        {prescriptions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No prescriptions recorded.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {prescriptions.map((prescription) => (
              <li key={prescription.id} className="text-sm">
                {prescription.medication} - {prescription.dosage}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}