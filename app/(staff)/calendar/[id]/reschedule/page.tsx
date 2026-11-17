import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Clock3 } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { getAvailableSlots, getLocalDateKey, parseDateKey } from "@/lib/appointments/availability";
import { prisma } from "@/lib/prisma";
import { rescheduleStaffAppointment } from "../../actions";

export default async function RescheduleStaffAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ practitionerId?: string; date?: string }>;
}) {
  const session = await requirePermission("appointment:*");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      practiceId: session.practiceId,
      ...(session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    include: {
      practice: { select: { timeZone: true } },
      patient: { select: { firstName: true, lastName: true } },
      practitioner: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!appointment) notFound();
  if (appointment.status !== "BOOKED" || appointment.scheduledAt <= new Date()) {
    throw new Error("This appointment can no longer be rescheduled.");
  }

  const practitioners = await prisma.staff.findMany({
    where: {
      practiceId: session.practiceId,
      isActive: true,
      role: "PRACTITIONER",
      ...(session.role === "PRACTITIONER" ? { id: session.userId } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });
  const selectedPractitioner = practitioners.find((person) => person.id === query.practitionerId)
    ?? practitioners.find((person) => person.id === appointment.practitionerId)
    ?? practitioners[0];
  const date = query.date ?? getLocalDateKey(appointment.scheduledAt, appointment.practice.timeZone);
  let validDate = true;
  try { parseDateKey(date); } catch { validDate = false; }
  const hasSearch = Boolean(query.date && query.practitionerId && validDate && selectedPractitioner?.id === query.practitionerId);
  const slots = hasSearch && selectedPractitioner
    ? await getAvailableSlots({ practiceId: session.practiceId, practitionerId: selectedPractitioner.id, dateKey: date, timeZone: appointment.practice.timeZone, ignoreAppointmentId: appointment.id })
    : [];
  const today = getLocalDateKey(new Date(), appointment.practice.timeZone);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/calendar" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#397f99]"><ArrowLeft className="size-4" />Back to calendar</Link>
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-7"><div className="flex items-center gap-3"><CalendarClock className="size-6 text-[#397f99]" /><div><h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Reschedule appointment</h1><p className="mt-1 text-sm text-slate-500">{appointment.patient.firstName} {appointment.patient.lastName} · Choose a new open time.</p></div></div></div>
        {practitioners.length === 0 ? <p className="p-6 text-sm text-slate-500">No active practitioners are available.</p> : <>
          <form method="get" className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:px-7">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Practitioner<select name="practitionerId" defaultValue={selectedPractitioner?.id} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950">{practitioners.map((person) => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Date<input type="date" required min={today} name="date" defaultValue={date} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
            <button className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold dark:border-slate-700">Show times</button>
          </form>
          {hasSearch && (slots.length === 0 ? <div className="mx-5 mb-5 rounded-xl border border-dashed border-slate-300 p-7 text-center dark:border-slate-700"><Clock3 className="mx-auto size-7 text-slate-300" /><p className="mt-2 font-semibold text-slate-800 dark:text-slate-200">No available times on this date</p><p className="mt-1 text-sm text-slate-500">Try another date or practitioner.</p></div> : <form action={rescheduleStaffAppointment} className="space-y-5 border-t border-slate-200 p-5 sm:px-7 dark:border-slate-800">
            <input type="hidden" name="appointmentId" value={appointment.id} /><input type="hidden" name="practitionerId" value={selectedPractitioner!.id} /><input type="hidden" name="date" value={date} />
            <fieldset><legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">Available times</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{slots.map((slot, index) => <label key={slot.time} className="cursor-pointer"><input required type="radio" name="time" value={slot.time} defaultChecked={index === 0} className="peer sr-only" /><span className="flex h-11 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold peer-checked:border-[#397f99] peer-checked:bg-[#397f99]/10 dark:border-slate-700">{slot.scheduledAt.toLocaleTimeString([], { timeZone: appointment.practice.timeZone, hour: "numeric", minute: "2-digit" })}</span></label>)}</div></fieldset>
            <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800"><button className="h-10 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">Confirm new time</button></div>
          </form>)}
        </>}
      </section>
    </main>
  );
}
