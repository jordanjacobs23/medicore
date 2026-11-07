import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { createAppointment } from "../actions";

export default async function NewAppointmentPage() {
  const session = await requirePermission("appointment:*");
  const [patients, practitioners] = await Promise.all([
    prisma.patient.findMany({
      where: { practiceId: session.practiceId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.staff.findMany({
      where: {
        practiceId: session.practiceId,
        isActive: true,
        role: "PRACTITIONER",
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const localDefault = new Date();
  localDefault.setMinutes(localDefault.getMinutes() - localDefault.getTimezoneOffset());
  localDefault.setSeconds(0, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]"
      >
        <ArrowLeft className="size-4" />
        Back to calendar
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]">
              <CalendarPlus className="size-5" />
            </div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">
                Schedule appointment
              </h1>
              <p className="mt-1 text-sm text-slate-500">Add a booking to the practice calendar.</p>
            </div>
          </div>
        </div>

        <form action={createAppointment} className="space-y-5 p-5 sm:p-7">
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Patient
            <select
              required
              name="patientId"
              defaultValue=""
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="" disabled>Select a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Date and time
              <input
                required
                type="datetime-local"
                name="scheduledAt"
                defaultValue={localDefault.toISOString().slice(0, 16)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Practitioner
              <select
                name="practitionerId"
                defaultValue=""
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Unassigned</option>
                {practitioners.map((practitioner) => (
                  <option key={practitioner.id} value={practitioner.id}>
                    {practitioner.firstName} {practitioner.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Reason for visit
            <textarea
              name="reason"
              rows={4}
              placeholder="Optional appointment note"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link href="/calendar" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              Cancel
            </Link>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">
              Schedule appointment
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
