import Link from "next/link";
import { ArrowLeft, CalendarCheck, Clock3 } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { addDaysToDateKey, getAvailableSlots, getLocalDateKey, parseDateKey } from "@/lib/appointments/availability";
import { prisma } from "@/lib/prisma";
import { bookPatientAppointment } from "../actions";

export default async function BookPatientAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ practitionerId?: string; date?: string }>;
}) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;
  const params = await searchParams;

  const [practice, patient, practitioners] = await Promise.all([
    prisma.practice.findUnique({ where: { id: session.practiceId }, select: { timeZone: true } }),
    prisma.patient.findUnique({ where: { id: session.userId }, select: { phone: true, smsRemindersEnabled: true } }),
    prisma.staff.findMany({
      where: { practiceId: session.practiceId, isActive: true, role: "PRACTITIONER" },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);
  if (!practice || !patient) return null;

  const today = getLocalDateKey(new Date(), practice.timeZone);
  const defaultDate = addDaysToDateKey(today, 1);
  const date = params.date ?? defaultDate;
  let validDate = true;
  try { parseDateKey(date); } catch { validDate = false; }
  const selectedPractitioner = practitioners.find((person) => person.id === params.practitionerId) ?? practitioners[0];
  const hasSearch = Boolean(params.date && params.practitionerId && validDate && selectedPractitioner?.id === params.practitionerId);
  const slots = hasSearch && selectedPractitioner
    ? await getAvailableSlots({ practiceId: session.practiceId, practitionerId: selectedPractitioner.id, dateKey: date, timeZone: practice.timeZone })
    : [];
  const minimumDate = today;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal/appointments" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to appointments
      </Link>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-6 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#397f99]/10 text-[#397f99]"><CalendarCheck className="size-6" /></div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Book an appointment</h1>
              <p className="mt-1 text-sm text-slate-500">Choose from the practitioner’s available appointment times.</p>
            </div>
          </div>
        </div>

        {practitioners.length === 0 ? (
          <div className="px-5 py-12 text-center sm:px-7">
            <Clock3 className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">No practitioners available</p>
            <p className="mt-1 text-sm text-slate-500">Please contact your practice to schedule an appointment.</p>
          </div>
        ) : (
          <>
            <form method="get" className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:px-7">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Practitioner
                <select required name="practitionerId" defaultValue={selectedPractitioner?.id} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950">
                  {practitioners.map((practitioner) => <option key={practitioner.id} value={practitioner.id}>{practitioner.firstName} {practitioner.lastName}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Date
                <input required type="date" name="date" min={minimumDate} defaultValue={date} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <button type="submit" className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">Show times</button>
            </form>

            {hasSearch && (
              slots.length === 0 ? (
                <div className="mx-5 mb-5 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center sm:mx-7 dark:border-slate-700">
                  <Clock3 className="mx-auto size-7 text-slate-300" />
                  <p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">No available times on this date</p>
                  <p className="mt-1 text-sm text-slate-500">Try another date or practitioner, or contact the practice.</p>
                </div>
              ) : (
                <form action={bookPatientAppointment} className="space-y-5 border-t border-slate-200 p-5 sm:px-7 dark:border-slate-800">
                  <input type="hidden" name="practitionerId" value={selectedPractitioner!.id} />
                  <input type="hidden" name="date" value={date} />
                  <fieldset>
                    <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">Available times</legend>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.map((slot, index) => (
                        <label key={`${slot.time}-${index}`} className="cursor-pointer">
                          <input required type="radio" name="time" value={slot.time} defaultChecked={index === 0} className="peer sr-only" />
                          <span className="flex h-11 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 transition peer-checked:border-[#397f99] peer-checked:bg-[#397f99]/10 peer-checked:text-[#28627a] dark:border-slate-700 dark:text-slate-200 dark:peer-checked:text-[#9ccde0]">
                            {slot.scheduledAt.toLocaleTimeString([], { timeZone: practice.timeZone, hour: "numeric", minute: "2-digit" })}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Reason for visit
                    <textarea required name="reason" rows={3} maxLength={500} placeholder="Tell the practice briefly what you would like help with" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#397f99] dark:border-slate-700 dark:bg-slate-950" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Visit type
                    <select name="kind" defaultValue="IN_PERSON" className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950">
                      <option value="IN_PERSON">In person</option>
                      <option value="TELEHEALTH">Telehealth</option>
                    </select>
                  </label>
                  {patient.phone?.trim() ? (
                    <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input type="hidden" name="smsOptInPreference" value="submitted" />
                      <input type="checkbox" name="smsRemindersEnabled" defaultChecked={patient.smsRemindersEnabled} className="mt-0.5 size-4 accent-[#397f99]" />
                      <span>Send appointment reminders by SMS to the phone number on my account.</span>
                    </label>
                  ) : (
                    <p className="text-xs text-slate-500">Add a phone number to your patient record to receive SMS reminders.</p>
                  )}
                  <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
                    <button type="submit" className="inline-flex h-10 items-center justify-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">Confirm booking</button>
                  </div>
                </form>
              )
            )}
          </>
        )}
      </section>
    </main>
  );
}
