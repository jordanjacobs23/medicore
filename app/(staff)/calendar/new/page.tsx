import Link from "next/link";
import { ArrowLeft, CalendarPlus, Clock3 } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { getAvailableSlots, getLocalDateKey, parseDateKey } from "@/lib/appointments/availability";
import { prisma } from "@/lib/prisma";
import { createAppointment } from "../actions";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ practitionerId?: string; date?: string }>;
}) {
  const session = await requirePermission("appointment:*");
  const params = await searchParams;
  const [patients, practitioners, practice] = await Promise.all([
    prisma.patient.findMany({
      where: { practiceId: session.practiceId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.staff.findMany({
      where: { practiceId: session.practiceId, isActive: true, role: "PRACTITIONER" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.practice.findUnique({ where: { id: session.practiceId }, select: { timeZone: true } }),
  ]);
  await logSensitiveRecordAccess(session, {
    resourceType: "APPOINTMENT_PATIENT_SELECTION",
    metadata: { patientCount: patients.length },
  });
  if (!practice) throw new Error("Practice not found.");

  const today = getLocalDateKey(new Date(), practice.timeZone);
  const date = params.date ?? today;
  let validDate = true;
  try { parseDateKey(date); } catch { validDate = false; }
  const selectedPractitioner = practitioners.find((person) => person.id === params.practitionerId) ?? practitioners[0];
  const hasSearch = Boolean(params.date && params.practitionerId && validDate && selectedPractitioner?.id === params.practitionerId);
  const slots = hasSearch && selectedPractitioner
    ? await getAvailableSlots({ practiceId: session.practiceId, practitionerId: selectedPractitioner.id, dateKey: date, timeZone: practice.timeZone })
    : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/calendar" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]"><ArrowLeft className="size-4" />Back to calendar</Link>
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]"><CalendarPlus className="size-5" /></div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Schedule appointment</h1>
              <p className="mt-1 text-sm text-slate-500">Choose an open time from the practitioner’s schedule.</p>
            </div>
          </div>
        </div>

        {practitioners.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Add a practitioner and configure their schedule before booking an appointment.</div>
        ) : (
          <>
            <form method="get" className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:px-7">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Practitioner
                <select required name="practitionerId" defaultValue={selectedPractitioner?.id} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950">
                  {practitioners.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Date
                <input required type="date" name="date" min={today} defaultValue={date} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <button className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Show times</button>
            </form>

            {hasSearch && (slots.length === 0 ? (
              <div className="mx-5 mb-5 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center sm:mx-7 dark:border-slate-700">
                <Clock3 className="mx-auto size-7 text-slate-300" />
                <p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">No available times on this date</p>
                <p className="mt-1 text-sm text-slate-500">The practitioner may be off that day or all slots may already be booked.</p>
              </div>
            ) : (
              <form action={createAppointment} className="space-y-5 border-t border-slate-200 p-5 sm:px-7 dark:border-slate-800">
                <input type="hidden" name="practitionerId" value={selectedPractitioner!.id} />
                <input type="hidden" name="date" value={date} />
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Patient
                  <select required name="patientId" defaultValue="" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950">
                    <option value="" disabled>Select a patient</option>
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}
                  </select>
                </label>
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">Available times</legend>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((slot, index) => <label key={`${slot.time}-${index}`} className="cursor-pointer">
                      <input required type="radio" name="time" value={slot.time} defaultChecked={index === 0} className="peer sr-only" />
                      <span className="flex h-11 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 peer-checked:border-[#397f99] peer-checked:bg-[#397f99]/10 peer-checked:text-[#28627a] dark:border-slate-700 dark:text-slate-200 dark:peer-checked:text-[#9ccde0]">{slot.scheduledAt.toLocaleTimeString([], { timeZone: practice.timeZone, hour: "numeric", minute: "2-digit" })}</span>
                    </label>)}
                  </div>
                </fieldset>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Reason for visit
                  <textarea name="reason" rows={3} maxLength={500} placeholder="Optional appointment note" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800"><button type="submit" className="inline-flex h-10 items-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">Schedule appointment</button></div>
              </form>
            ))}
          </>
        )}
      </section>
    </main>
  );
}
