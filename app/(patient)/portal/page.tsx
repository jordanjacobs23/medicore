import { requirePatientSelfAccess } from "@/lib/authorization/require-permission";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarDays, CalendarPlus, FileBadge2, FileText, MessageSquare, Microscope, ReceiptText, ShieldCheck, UserRound } from "lucide-react";

export default async function PatientPortalPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return null;
  }
  await requirePatientSelfAccess(session.userId);
  const [patient, appointments, prescriptions, unreadMessages] = await Promise.all([
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
      include: { practice: { select: { timeZone: true } } },
    }),
    prisma.prescription.findMany({
      where: {
        patientId: session.userId,
        encounter: { practiceId: session.practiceId },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        practitioner: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.portalMessage.count({
      where: {
        practiceId: session.practiceId,
        patientId: session.userId,
        senderType: "PRACTICE",
        readAt: null,
      },
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
        <Link href="/portal/results" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <Microscope className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Released Lab Results</p>
        </Link>
        <Link href="/portal/tax-certificates" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <FileBadge2 className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Tax Certificates</p>
        </Link>
        <Link href="/portal/profile" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <UserRound className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Profile</p>
        </Link>
        <Link href="/portal/privacy" className="rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <ShieldCheck className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Privacy and Records</p>
        </Link>
        <Link href="/portal/messages" className="relative rounded-xl border border-slate-200 p-5 transition hover:border-[#397f99]">
          <MessageSquare className="size-5 text-[#397f99]" />
          <p className="mt-3 font-semibold">Messages</p>
          {unreadMessages > 0 ? (
            <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#dc2626] text-[11px] font-bold leading-none text-white">
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          ) : null}
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
                {appointment.scheduledAt.toLocaleString(undefined, { timeZone: appointment.practice.timeZone })} - {appointment.status}
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
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{prescription.medication}</p>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {prescription.dosage} · {prescription.route ?? "Route not recorded"} · {prescription.frequency ?? "Frequency not recorded"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {prescription.duration ? `Duration ${prescription.duration} · ` : ""}
                    {prescription.quantity ? `Quantity ${prescription.quantity} · ` : ""}
                    {prescription.refills} refill{prescription.refills === 1 ? "" : "s"} · {prescription.status}
                  </p>
                  {prescription.instructions && <p className="mt-2 text-xs text-slate-500">{prescription.instructions}</p>}
                  <p className="mt-2 text-xs text-slate-400">
                    Prescribed by {prescription.practitioner.firstName} {prescription.practitioner.lastName} on {prescription.createdAt.toLocaleDateString()}. This is an electronic record and was not sent to a pharmacy.
                  </p>
                  <a href={`/api/portal/prescriptions/${prescription.id}`} className="mt-3 inline-flex h-8 items-center rounded-md border border-slate-200 px-3 text-xs font-semibold text-[#397f99] hover:border-[#397f99] dark:border-slate-700">Download prescription PDF</a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Prescription entries are free text. The portal does not assess allergies or medication interactions.
        </p>
      </section>
    </main>
  );
}
