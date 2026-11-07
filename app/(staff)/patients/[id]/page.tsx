import {
  requirePermission,
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/components/clinical-core/src/rbac";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  ClipboardPlus,
  Mail,
  Pill,
  Stethoscope,
} from "lucide-react";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("patient:read");
  const { id } = await params;
  await requirePractitionerPatientAccess(id);
  const canReadAppointments = hasPermission(session.role, "appointment:read");
  const canReadEncounters = hasPermission(session.role, "encounter:read");
  const canReadPrescriptions = hasPermission(session.role, "prescription:read");
  const patient = await prisma.patient.findFirst({
    where: { id, practiceId: session.practiceId },
  });

  if (!patient) notFound();

  const [appointments, encounters, prescriptions, counts] = await Promise.all([
    canReadAppointments
      ? prisma.appointment.findMany({
          where: { patientId: id, practiceId: session.practiceId },
          orderBy: { scheduledAt: "desc" },
          include: { practitioner: true },
          take: 8,
        })
      : Promise.resolve([]),
    canReadEncounters
      ? prisma.encounter.findMany({
          where: { patientId: id, practiceId: session.practiceId },
          orderBy: { startedAt: "desc" },
          include: { practitioner: true },
          take: 6,
        })
      : Promise.resolve([]),
    canReadPrescriptions
      ? prisma.prescription.findMany({
          where: { patientId: id, encounter: { practiceId: session.practiceId } },
          orderBy: { createdAt: "desc" },
          include: { practitioner: true },
          take: 6,
        })
      : Promise.resolve([]),
    Promise.all([
      prisma.appointment.count({ where: { patientId: id, practiceId: session.practiceId } }),
      prisma.encounter.count({ where: { patientId: id, practiceId: session.practiceId } }),
      prisma.prescription.count({ where: { patientId: id, encounter: { practiceId: session.practiceId } } }),
    ]),
  ]);

  const initials =
    `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]"
      >
        <ArrowLeft className="size-4" />
        Back to patients
      </Link>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="h-24 bg-[linear-gradient(110deg,#102b3a,#397f99_58%,#65a8bd)]" />
        <div className="-mt-12 px-5 pb-5 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex size-24 items-center justify-center rounded-2xl border-4 border-white bg-[#dcecf3] text-2xl font-bold text-[#397f99] shadow-sm dark:border-slate-950 dark:bg-[#17394a]">
                {initials}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
                    Active
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  PAT-{patient.id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <a
                href={`mailto:${patient.email}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-[#397f99] hover:text-[#397f99] dark:border-slate-700 dark:text-slate-200"
              >
                <Mail className="size-4" />
                Email
              </a>
              <Link
                href="/calendar"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white transition hover:bg-[#2f718a]"
              >
                <CalendarDays className="size-4" />
                Book visit
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Patient information
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-slate-400">Email address</dt>
                <dd className="mt-1 break-all font-medium text-slate-700 dark:text-slate-200">
                  {patient.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Patient reference</dt>
                <dd className="mt-1 font-mono text-xs font-medium text-[#397f99]">
                  {patient.id}
                </dd>
              </div>
            </dl>
          </article>

          <article className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {[
              ["Visits", canReadAppointments ? counts[0] : 0],
              ["Encounters", canReadEncounters ? counts[1] : 0],
              ["Scripts", canReadPrescriptions ? counts[2] : 0],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="border-r border-slate-200 px-3 py-4 text-center last:border-r-0 dark:border-slate-800"
              >
                <p className="text-xl font-bold text-slate-950 dark:text-white">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </article>
        </aside>

        <div className="min-w-0 space-y-5">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[#397f99]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Appointments
                </h2>
              </div>
              <Link href="/calendar" className="text-xs font-bold text-[#397f99]">
                View calendar
              </Link>
            </div>
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800/80"
              >
                <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-900">
                  <span>{new Intl.DateTimeFormat("en", { month: "short" }).format(appointment.scheduledAt)}</span>
                  <span className="text-base leading-4 text-slate-800 dark:text-slate-200">
                    {appointment.scheduledAt.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {appointment.reason || "Clinical appointment"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(appointment.scheduledAt)}
                    {appointment.practitioner
                      ? ` · ${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`
                      : ""}
                  </p>
                </div>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  {appointment.status.replace("_", " ")}
                </span>
                <ChevronRight className="size-4 text-slate-300" />
              </div>
            ))}
            {appointments.length === 0 && (
              <EmptyState icon={CalendarDays} text="No appointments recorded" />
            )}
          </article>

          <div className="grid gap-5 xl:grid-cols-2">
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <Stethoscope className="size-4 text-[#397f99]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Clinical encounters</h2>
              </div>
              {encounters.map((encounter) => (
                <div key={encounter.id} className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {encounter.chiefComplaint || "Clinical encounter"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(encounter.startedAt)} · {encounter.status.replace("_", " ")}
                  </p>
                  {encounter.diagnosis && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Diagnosis: {encounter.diagnosis}
                    </p>
                  )}
                </div>
              ))}
              {encounters.length === 0 && (
                <EmptyState icon={Stethoscope} text="No encounters recorded" />
              )}
            </article>

            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <Pill className="size-4 text-[#397f99]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Prescriptions</h2>
              </div>
              {prescriptions.map((prescription) => (
                <div key={prescription.id} className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{prescription.medication}</p>
                      <p className="mt-1 text-xs text-slate-500">{prescription.dosage}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{prescription.status}</span>
                  </div>
                </div>
              ))}
              {prescriptions.length === 0 && (
                <EmptyState icon={Pill} text="No prescriptions recorded" />
              )}
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof ClipboardPlus; text: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Icon className="size-7 text-slate-300" />
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}
