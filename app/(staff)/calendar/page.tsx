import Link from "next/link";
import { CalendarDays, CalendarPlus, Clock3 } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { hasPermission } from "@/components/clinical-core/src/rbac";
import { addDaysToDateKey, dateTimeInTimeZone, getAvailableSlots, getLocalDateKey, parseDateKey } from "@/lib/appointments/availability";
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
  searchParams: Promise<{ date?: string; practitionerId?: string }>;
}) {
  const session = await requirePermission("appointment:read");
  const canManageAppointments = hasPermission(session.role, "appointment:*");
  const params = await searchParams;
  const [practice, practitioners] = await Promise.all([
    prisma.practice.findUnique({ where: { id: session.practiceId }, select: { timeZone: true } }),
    prisma.staff.findMany({
      where: {
        practiceId: session.practiceId,
        isActive: true,
        role: "PRACTITIONER",
        ...(session.role === "PRACTITIONER" ? { id: session.userId } : {}),
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  if (!practice) throw new Error("Practice not found.");

  const timeZone = practice.timeZone;
  const todayKey = getLocalDateKey(new Date(), timeZone);
  let dateValue = params.date ?? todayKey;
  try { parseDateKey(dateValue); } catch { dateValue = todayKey; }
  const selectedDate = dateTimeInTimeZone(dateValue, "00:00", timeZone);
  const selectedTomorrow = dateTimeInTimeZone(addDaysToDateKey(dateValue, 1), "00:00", timeZone);
  const today = dateTimeInTimeZone(todayKey, "00:00", timeZone);
  const tomorrow = dateTimeInTimeZone(addDaysToDateKey(todayKey, 1), "00:00", timeZone);
  const selectedPractitioner =
    practitioners.find((person) => person.id === params.practitionerId) ??
    (session.role === "PRACTITIONER" ? practitioners[0] : undefined);
  const practitionerScope = selectedPractitioner ? { practitionerId: selectedPractitioner.id } : {};

  const [todayAppointments, waitingAppointments, openEncounters, appointments, slots] = await Promise.all([
    prisma.appointment.count({ where: { practiceId: session.practiceId, ...practitionerScope, scheduledAt: { gte: today, lt: tomorrow } } }),
    prisma.appointment.count({
      where: { practiceId: session.practiceId, ...practitionerScope, status: "ARRIVED", scheduledAt: { gte: today, lt: tomorrow } },
    }),
    prisma.encounter.count({
      where: { practiceId: session.practiceId, ...(selectedPractitioner ? { practitionerId: selectedPractitioner.id } : session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}), status: "IN_PROGRESS", startedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.findMany({
      where: { practiceId: session.practiceId, ...practitionerScope, scheduledAt: { gte: selectedDate, lt: selectedTomorrow } },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        practitioner: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    selectedPractitioner
      ? getAvailableSlots({ practiceId: session.practiceId, practitionerId: selectedPractitioner.id, dateKey: dateValue, timeZone })
      : Promise.resolve([]),
  ]);
  const openSlotCount = selectedPractitioner
    ? slots.length
    : (await Promise.all(practitioners.map((person) =>
        getAvailableSlots({ practiceId: session.practiceId, practitionerId: person.id, dateKey: dateValue, timeZone }),
      ))).reduce((total, available) => total + available.length, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Appointments</p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Calendar</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage visits and see open appointment times.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {session.role === "PRACTICE_MANAGER" && <Link href="/practice/schedules" className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Practitioner schedules</Link>}
          <Link href="/patients" className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Find Patient</Link>
          {canManageAppointments && <Link href="/calendar/new" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white"><CalendarPlus className="size-4" />Schedule Appointment</Link>}
        </div>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Appointments today", todayAppointments], ["Waiting", waitingAppointments], ["Open encounters", openEncounters], ["Open slots", openSlotCount]].map(([label, value]) => (
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
            <h2 className="font-montserrat font-bold text-slate-950 dark:text-white">{selectedDate.toLocaleDateString(undefined, { timeZone, weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2>
          </div>
          <form className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="appointment-date">Appointment Date</label>
            <input id="appointment-date" type="date" name="date" defaultValue={dateValue} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            {session.role !== "PRACTITIONER" && <select aria-label="Filter practitioner" name="practitionerId" defaultValue={selectedPractitioner?.id ?? ""} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
              <option value="">All practitioners</option>
              {practitioners.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}
            </select>}
            <button type="submit" className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">View</button>
          </form>
        </div>

        {appointments.length === 0 ? (
          <div className="px-5 py-12 text-center"><Clock3 className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No appointments scheduled for this date</p>{canManageAppointments && <Link href="/calendar/new" className="mt-2 inline-block text-sm font-semibold text-[#397f99]">Schedule an appointment</Link>}</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {appointments.map((appointment) => (
              <article key={appointment.id} className="grid gap-4 px-5 py-4 md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-center">
                <time className="font-mono text-sm font-semibold text-[#397f99]">{appointment.scheduledAt.toLocaleTimeString([], { timeZone, hour: "2-digit", minute: "2-digit" })}</time>
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{appointment.patient.firstName} {appointment.patient.lastName}</p>
                  <p className="mt-1 text-sm text-slate-500">{appointment.practitioner ? `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}` : "Practitioner unassigned"}{appointment.reason ? ` · ${appointment.reason}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[appointment.status]}`}>{appointment.status.replace("_", " ")}</span>
                  {appointment.kind === "TELEHEALTH" && (
                    <Link href={`/telehealth/${appointment.id}`} className="rounded-lg bg-[#397f99] px-3 py-2 text-xs font-bold text-white">Join telehealth</Link>
                  )}
                  {canManageAppointments && appointment.status === "BOOKED" && appointment.scheduledAt > new Date() && <Link href={`/calendar/${appointment.id}/reschedule`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Reschedule</Link>}
                  {canManageAppointments && !(["COMPLETED", "CANCELLED", "NO_SHOW"] as string[]).includes(appointment.status) && (
                    <form action={updateAppointmentStatus} className="flex items-center">
                      <input type="hidden" name="appointmentId" value={appointment.id} />
                      <select aria-label={`Update status for ${appointment.patient.firstName} ${appointment.patient.lastName}`} name="status" defaultValue="" className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-950">
                        <option value="" disabled>Update status</option><option value="ARRIVED">Arrived</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="NO_SHOW">No show</option><option value="CANCELLED">Cancelled</option>
                      </select>
                      <button type="submit" className="ml-2 h-9 rounded-lg bg-slate-100 px-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Save</button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {!selectedPractitioner && <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">Choose a practitioner in the date filter to see their available appointment times.</p>}
      {selectedPractitioner && <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div><h2 className="font-montserrat font-bold text-slate-950 dark:text-white">Available times · {selectedPractitioner.firstName} {selectedPractitioner.lastName}</h2><p className="mt-1 text-sm text-slate-500">{selectedDate.toLocaleDateString(undefined, { timeZone, weekday: "long", month: "long", day: "numeric" })}</p></div>
          <span className="text-sm font-semibold text-[#397f99]">{slots.length} open {slots.length === 1 ? "slot" : "slots"}</span>
        </div>
        {slots.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{slots.map((slot) => <span key={slot.time} className="rounded-lg bg-[#397f99]/10 px-3 py-2 text-sm font-semibold text-[#28627a] dark:text-[#9ccde0]">{slot.scheduledAt.toLocaleTimeString([], { timeZone, hour: "numeric", minute: "2-digit" })}</span>)}</div> : <p className="mt-4 text-sm text-slate-500">No bookable times. Check the weekly schedule or choose another date.</p>}
      </section>}
    </main>
  );
}
