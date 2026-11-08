import Link from "next/link";
import { ArrowLeft, CalendarCheck, Clock3 } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { bookPatientAppointment } from "../actions";

export default async function BookPatientAppointmentPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return null;
  }

  const practitioners = await prisma.staff.findMany({
    where: {
      practiceId: session.practiceId,
      isActive: true,
      role: "PRACTITIONER",
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(9, 0, 0, 0);
  defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-10 sm:px-6">
      <Link
        href="/portal/appointments"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]"
      >
        <ArrowLeft className="size-4" />
        Back to appointments
      </Link>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-6 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[#397f99]/10 text-[#397f99]">
              <CalendarCheck className="size-6" />
            </div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Book an appointment</h1>
              <p className="mt-1 text-sm text-slate-500">Choose a practitioner and a convenient time.</p>
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
          <form action={bookPatientAppointment} className="space-y-5 p-5 sm:p-7">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Practitioner
              <select
                required
                name="practitionerId"
                defaultValue=""
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="" disabled>Select a practitioner</option>
                {practitioners.map((practitioner) => (
                  <option key={practitioner.id} value={practitioner.id}>
                    {practitioner.firstName} {practitioner.lastName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Date and time
              <input
                required
                type="datetime-local"
                name="scheduledAt"
                min={defaultDate.toISOString().slice(0, 16)}
                defaultValue={defaultDate.toISOString().slice(0, 16)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Reason for visit
              <textarea
                required
                name="reason"
                rows={4}
                maxLength={500}
                placeholder="Tell the practice briefly what you would like help with"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
              <Link href="/portal/appointments" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Cancel
              </Link>
              <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">
                Confirm booking
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
