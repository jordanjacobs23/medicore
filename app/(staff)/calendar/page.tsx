import Link from "next/link";
import { CalendarDays, CalendarPlus, Clock3 } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { updateAppointmentStatus } from "./actions";

const statusStyles: Record<string, string> = {
  BOOKED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  ARRIVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  IN_PROGRESS: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  COMPLETED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  NO_SHOW: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requirePermission("appointment:read");
  const params = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const selectedDate = params.date ? new Date(`${params.date}T00:00:00`) : today;
  if (Number.isNaN(selectedDate.getTime())) selectedDate.setTime(today.getTime());
  const selectedTomorrow = new Date(selectedDate);
  selectedTomorrow.setDate(selectedTomorrow.getDate() + 1);
  const dateValue = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, "0"),
    String(selectedDate.getDate()).padStart(2, "0"),
  ].join("-");

  const [todayAppointments, bookedAppointments, arrivedAppointments, appointments] =
    await Promise.all([
    prisma.appointment.count({
      where: { practiceId: session.practiceId, scheduledAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({
      where: { practiceId: session.practiceId, status: "BOOKED" },
    }),
    prisma.appointment.count({
      where: { practiceId: session.practiceId, status: "ARRIVED", scheduledAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.findMany({
      where: { practiceId: session.practiceId, scheduledAt: { gte: selectedDate, lt: selectedTomorrow } },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        practitioner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Appointments</p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Calendar</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Schedule visits and manage patient appointments.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/patients" className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            Find Patient
          </Link>
          <Link href="/calendar/new" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">
            <CalendarPlus className="size-4" />
            Schedule Appointment
          </Link>
        </div>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Today", todayAppointments],
          ["Booked", bookedAppointments],
          ["Arrived", arrivedAppointments],
          ["Scheduled on date", appointments.length],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-[#397f99]" />
            <h2 className="font-montserrat font-bold text-slate-950 dark:text-white">
              {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </h2>
          </div>
          <form>
            <label className="sr-only" htmlFor="appointment-date">Appointment Date</label>
            <input
              id="appointment-date"
              type="date"
              name="date"
              defaultValue={dateValue}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <button type="submit" className="ml-2 h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              View
            </button>
          </form>
        </div>

        {appointments.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Clock3 className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No Appointments Scheduled Today</p>
            <Link href="/calendar/new" className="mt-2 inline-block text-sm font-semibold text-[#397f99]">Schedule the first visit</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {appointments.map((appointment) => (
              <article key={appointment.id} className="grid gap-4 px-5 py-4 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-center">
                <time className="font-mono text-sm font-semibold text-[#397f99]">
                  {appointment.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </time>
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {appointment.patient.firstName} {appointment.patient.lastName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.practitioner
                      ? `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`
                      : "Practitioner unassigned"}
                    {appointment.reason ? ` · ${appointment.reason}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[appointment.status]}`}>
                    {appointment.status.replace("_", " ")}
                  </span>
                  {!["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appointment.status) && (
                    <form action={updateAppointmentStatus}>
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <select
                        aria-label={`Update status for ${appointment.patient.firstName} ${appointment.patient.lastName}`}
                        name="status"
                        defaultValue=""
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="" disabled>Update status</option>
                        <option value="ARRIVED">Arrived</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="NO_SHOW">No show</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      <button type="submit" className="ml-2 h-9 rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Save
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
