import Link from "next/link";
import { ArrowLeft, CalendarClock, Save } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { savePractitionerSchedule } from "./actions";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const durations = [15, 20, 30, 45, 60];

export default async function PractitionerSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ practitionerId?: string; saved?: string }>;
}) {
  const session = await requirePermission("staff:*");
  const params = await searchParams;
  const [practitioners, practice] = await Promise.all([
    prisma.staff.findMany({
      where: { practiceId: session.practiceId, isActive: true, role: "PRACTITIONER" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.practice.findUnique({ where: { id: session.practiceId }, select: { timeZone: true } }),
  ]);
  if (!practice) throw new Error("Practice not found.");
  const selectedPractitioner = practitioners.find((person) => person.id === params.practitionerId) ?? practitioners[0];
  const schedules = selectedPractitioner
    ? await prisma.practitionerSchedule.findMany({
        where: { practiceId: session.practiceId, practitionerId: selectedPractitioner.id },
      })
    : [];
  const byDay = new Map(schedules.map((schedule) => [schedule.dayOfWeek, schedule]));

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/calendar" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to calendar
      </Link>
      <div className="mt-5 flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#397f99]/10 text-[#397f99]"><CalendarClock className="size-6" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#397f99]">Availability</p>
          <h1 className="mt-1 font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Practitioner schedules</h1>
          <p className="mt-2 text-sm text-slate-500">Set recurring weekly hours and appointment length. Schedule times use {practice.timeZone}.</p>
        </div>
      </div>

      {params.saved && <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">Schedule saved. New bookings will use these hours.</p>}

      {practitioners.length === 0 ? (
        <section className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          Add an active practitioner before setting appointment hours.
        </section>
      ) : (
        <>
          <form method="get" className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-950">
            <label className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Practitioner
              <select name="practitionerId" defaultValue={selectedPractitioner?.id} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950">
                {practitioners.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}
              </select>
            </label>
            <button className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Load schedule</button>
          </form>

          <form action={savePractitionerSchedule} className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <input type="hidden" name="practitionerId" value={selectedPractitioner!.id} />
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {weekdays.map((weekday, dayOfWeek) => {
                const schedule = byDay.get(dayOfWeek);
                return (
                  <div key={weekday} className="grid gap-4 p-4 sm:grid-cols-[120px_105px_1fr_1fr_150px] sm:items-end">
                    <p className="font-semibold text-slate-900 dark:text-white">{weekday}</p>
                    <label className="flex h-10 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input type="checkbox" name={`enabled-${dayOfWeek}`} defaultChecked={Boolean(schedule)} className="size-4 accent-[#397f99]" />
                      Working
                    </label>
                    <label className="text-xs font-semibold text-slate-500">Start
                      <input type="time" name={`start-${dayOfWeek}`} defaultValue={schedule?.startTime ?? "09:00"} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">End
                      <input type="time" name={`end-${dayOfWeek}`} defaultValue={schedule?.endTime ?? "17:00"} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">Appointment length
                      <select name={`duration-${dayOfWeek}`} defaultValue={schedule?.slotDurationMinutes ?? 30} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                        {durations.map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs text-slate-500">One work window per day. Unchecked days have no bookable slots.</p>
              <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]"><Save className="size-4" />Save schedule</button>
            </div>
          </form>
        </>
      )}
    </main>
  );
}
