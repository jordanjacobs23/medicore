import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
} from "lucide-react";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requirePermission("patient:read");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const currentPage = Math.max(1, Number(params.page) || 1);
  const pageSize = 12;
  const where = {
    practiceId: session.practiceId,
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { id: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [patients, patientCount, recentAppointments] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        appointments: {
          orderBy: { scheduledAt: "desc" },
          take: 1,
          select: { scheduledAt: true, status: true },
        },
        _count: {
          select: { appointments: true, encounters: true },
        },
      },
    }),
    prisma.patient.count({ where }),
    prisma.appointment.count({
      where: {
        practiceId: session.practiceId,
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(patientCount / pageSize));

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">
            Patient registry
          </p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">
            Patients
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Search records and manage patient care from one workspace.
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(57,127,153,0.22)] transition hover:bg-[#2f718a]"
        >
          <UserPlus className="size-4" />
          Add patient
        </Link>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Registered patients", value: patientCount, icon: Users },
          { label: "Appointments today", value: recentAppointments, icon: ChevronRight },
        ].map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {label}
              </p>
              <Icon className="size-4 text-[#397f99]" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <form className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-3 sm:flex-row dark:border-slate-800 dark:bg-slate-900/50">
          <label className="relative flex-1">
            <span className="sr-only">Search patients</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by name, email or patient ID"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#397f99] hover:text-[#397f99] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <SlidersHorizontal className="size-4" />
            Search
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:border-slate-800">
                <th className="px-5 py-3.5">Patient</th>
                <th className="px-4 py-3.5">Patient ID</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Last visit</th>
                <th className="px-4 py-3.5">Visits</th>
                <th className="px-4 py-3.5">Encounters</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {patients.map((patient, index) => {
                const lastAppointment = patient.appointments[0];
                const initials =
                  `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();

                return (
                  <tr
                    key={patient.id}
                    className="group text-sm transition-colors hover:bg-[#397f99]/[0.035] dark:hover:bg-[#397f99]/10"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            index % 2 === 0
                              ? "bg-[#dcecf3] text-[#397f99]"
                              : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                          }`}
                        >
                          {initials}
                        </div>
                        <div>
                          <Link
                            href={`/patients/${patient.id}`}
                            className="font-semibold text-slate-900 hover:text-[#397f99] dark:text-slate-100"
                          >
                            {patient.firstName} {patient.lastName}
                          </Link>
                          <p className="mt-0.5 text-xs text-emerald-600">Registered</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#397f99]">
                      {patient.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="max-w-56 px-4 py-3 text-slate-600 dark:text-slate-300">
                      <p className="truncate">{patient.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {lastAppointment
                        ? new Intl.DateTimeFormat("en", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(lastAppointment.scheduledAt)
                        : "No visits"}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {patient._count.appointments}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {patient._count.encounters}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-[#397f99] hover:bg-[#397f99] hover:text-white dark:border-slate-700"
                        aria-label={`View ${patient.firstName} ${patient.lastName}`}
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Users className="mx-auto size-8 text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                      No patients found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another name, email, or patient ID.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p>
            Showing {patients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
            {(currentPage - 1) * pageSize + patients.length} of {patientCount}
          </p>
          <div className="flex items-center gap-2">
            <Link
              aria-disabled={currentPage <= 1}
              href={`/patients?q=${encodeURIComponent(query)}&page=${Math.max(1, currentPage - 1)}`}
              className={`inline-flex size-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 ${
                currentPage <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="px-2">
              {currentPage} / {totalPages}
            </span>
            <Link
              aria-disabled={currentPage >= totalPages}
              href={`/patients?q=${encodeURIComponent(query)}&page=${Math.min(totalPages, currentPage + 1)}`}
              className={`inline-flex size-8 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 ${
                currentPage >= totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
