import { requirePatientSelfAccess } from "@/lib/authorization/require-permission";
import { getSessionContext } from "@/lib/auth/session";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, CalendarPlus, ChevronRight, FileBadge2, FileText, MessageSquare, Microscope, Pill, ReceiptText, ShieldCheck, UserRound } from "lucide-react";

const shortcuts: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  surface: string;
  iconSurface: string;
}[] = [
  { href: "/portal/appointments", label: "Appointments", description: "Visits and bookings", icon: CalendarDays, surface: "border-sky-200 bg-sky-50/80 hover:bg-sky-100 dark:border-sky-900/80 dark:bg-sky-950/35 dark:hover:bg-sky-950/65", iconSurface: "bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-300" },
  { href: "/portal/invoices", label: "Invoices", description: "Balances and payments", icon: ReceiptText, surface: "border-amber-200 bg-amber-50/80 hover:bg-amber-100 dark:border-amber-900/80 dark:bg-amber-950/35 dark:hover:bg-amber-950/65", iconSurface: "bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-300" },
  { href: "/portal/documents", label: "Documents", description: "Files from your practice", icon: FileText, surface: "border-violet-200 bg-violet-50/80 hover:bg-violet-100 dark:border-violet-900/80 dark:bg-violet-950/35 dark:hover:bg-violet-950/65", iconSurface: "bg-violet-100 text-violet-700 dark:bg-violet-900/70 dark:text-violet-300" },
  { href: "/portal/results", label: "Released lab results", description: "Results shared with you", icon: Microscope, surface: "border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 dark:border-emerald-900/80 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/65", iconSurface: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-300" },
  { href: "/portal/tax-certificates", label: "Tax certificates", description: "Payment statements and files", icon: FileBadge2, surface: "border-rose-200 bg-rose-50/80 hover:bg-rose-100 dark:border-rose-900/80 dark:bg-rose-950/35 dark:hover:bg-rose-950/65", iconSurface: "bg-rose-100 text-rose-700 dark:bg-rose-900/70 dark:text-rose-300" },
  { href: "/portal/profile", label: "Profile", description: "Contact details and consent", icon: UserRound, surface: "border-cyan-200 bg-cyan-50/80 hover:bg-cyan-100 dark:border-cyan-900/80 dark:bg-cyan-950/35 dark:hover:bg-cyan-950/65", iconSurface: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/70 dark:text-cyan-300" },
  { href: "/portal/privacy", label: "Privacy and records", description: "Requests and data export", icon: ShieldCheck, surface: "border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 dark:border-indigo-900/80 dark:bg-indigo-950/35 dark:hover:bg-indigo-950/65", iconSurface: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-300" },
  { href: "/portal/messages", label: "Messages", description: "Talk with your practice", icon: MessageSquare, surface: "border-orange-200 bg-orange-50/80 hover:bg-orange-100 dark:border-orange-900/80 dark:bg-orange-950/35 dark:hover:bg-orange-950/65", iconSurface: "bg-orange-100 text-orange-700 dark:bg-orange-900/70 dark:text-orange-300" },
];

const statusSurfaces: Record<string, string> = {
  BOOKED: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
  ARRIVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  IN_PROGRESS: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
  COMPLETED: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  NO_SHOW: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
};

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
  await logSensitiveRecordAccess(session, {
    resourceType: "PORTAL_DASHBOARD",
    resourceId: session.userId,
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#123c50] via-[#176078] to-[#397f99] px-6 py-8 text-white shadow-lg shadow-cyan-950/15 sm:px-9 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full border-[28px] border-white/[0.07]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-24 size-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Patient portal</span>
          <h1 className="mt-4 font-montserrat text-3xl font-bold tracking-tight sm:text-4xl">Welcome, {patient.firstName}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-cyan-50/90 sm:text-base">Your care, appointments, and practice documents all in one place.</p>
        </div>
      </section>

      <section aria-label="Patient portal services" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map(({ href, label, description, icon: Icon, surface, iconSurface }) => (
          <Link key={href} href={href} className={`group relative flex min-h-32 items-start gap-3 rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${surface}`}>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconSurface}`}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block font-semibold text-slate-900 dark:text-white">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</span>
            </span>
            {label === "Messages" && unreadMessages > 0 ? (
              <span className="absolute right-3 top-3 flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 py-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-950">
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            ) : null}
            <ChevronRight aria-hidden="true" className="absolute bottom-3 right-3 size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-200" />
          </Link>
        ))}
      </section>

      <section className="mt-7 rounded-3xl border border-sky-200 bg-gradient-to-br from-white via-sky-50/70 to-cyan-50/80 p-5 shadow-sm dark:border-sky-900/70 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/30 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200"><CalendarDays className="size-5" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">Your schedule</p>
              <h2 className="mt-0.5 font-montserrat text-xl font-bold text-slate-950 dark:text-white">Appointments</h2>
            </div>
          </div>
          <Link href="/portal/appointments/book" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#397f99] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f718a]">
            <CalendarPlus className="size-4" />
            Book an Appointment
          </Link>
        </div>
        {appointments.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-sky-200 bg-white/70 px-4 py-5 text-sm text-slate-600 dark:border-sky-900/70 dark:bg-slate-900/60 dark:text-slate-300">No appointments recorded yet.</p>
        ) : (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-white/80 p-3.5 dark:border-sky-900/60 dark:bg-slate-900/70">
                <span className="min-w-0 text-sm font-medium text-slate-800 dark:text-slate-200">{appointment.scheduledAt.toLocaleString(undefined, { timeZone: appointment.practice.timeZone })}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusSurfaces[appointment.status] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{appointment.status.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/portal/appointments" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-800 hover:underline dark:text-sky-300">
          View and manage appointments <ChevronRight className="size-4" />
        </Link>
      </section>

      <section className="mt-5 rounded-3xl border border-violet-200 bg-gradient-to-br from-white via-violet-50/70 to-fuchsia-50/70 p-5 shadow-sm dark:border-violet-900/70 dark:from-slate-950 dark:via-slate-950 dark:to-violet-950/25 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200"><Pill className="size-5" /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">Medication records</p>
            <h2 className="mt-0.5 font-montserrat text-xl font-bold text-slate-950 dark:text-white">Prescriptions</h2>
          </div>
        </div>
        {prescriptions.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-white/70 px-4 py-5 text-sm text-slate-600 dark:border-violet-900/70 dark:bg-slate-900/60 dark:text-slate-300">No prescriptions recorded.</p>
        ) : (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {prescriptions.map((prescription) => (
              <li key={prescription.id} className="text-sm">
                <div className="h-full rounded-2xl border border-violet-100 bg-white/85 p-4 dark:border-violet-900/60 dark:bg-slate-900/70">
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
                  <a href={`/api/portal/prescriptions/${prescription.id}`} className="mt-3 inline-flex h-8 items-center rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-800 transition hover:border-violet-400 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:border-violet-700">Download prescription PDF</a>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/25 dark:text-amber-200">
          Prescription entries are free text. The portal does not assess allergies or medication interactions.
        </p>
      </section>
    </main>
  );
}
