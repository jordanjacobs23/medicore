import Link from "next/link";
import { ArrowLeft, CalendarDays, CalendarPlus, Clock3, UserRound } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cancelPatientAppointment } from "./actions";

const statusStyles: Record<string, string> = {
  BOOKED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  ARRIVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  IN_PROGRESS: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  COMPLETED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  NO_SHOW: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export default async function PatientAppointmentsPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return null;
  }

  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: { practiceId: session.practiceId, patientId: session.userId },
    include: {
      practitioner: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
  const upcoming = appointments.filter((appointment) => appointment.scheduledAt >= now && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status));
  const past = appointments.filter((appointment) => !upcoming.includes(appointment));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mt-15">
        <div>
          <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-[#397f99]">
            <ArrowLeft className="size-4" />
            Back to Portal
          </Link>
          <h1 className="mt-3 font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Appointments</h1>
          <p className="mt-2 text-sm text-slate-500">View your visits and manage upcoming bookings.</p>
        </div>
        <Link href="/portal/appointments/book" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">
          <CalendarPlus className="size-4" />
          Book Appointment
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="font-montserrat text-xl font-bold text-slate-950 dark:text-white">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-slate-700">
            <CalendarDays className="mx-auto size-9 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No upcoming appointments</p>
            <Link href="/portal/appointments/book" className="mt-2 inline-block text-sm font-semibold text-[#397f99]">Book your next visit</Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {upcoming.map((appointment) => (
              <article key={appointment.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex gap-4">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#397f99]/10 text-[#397f99]">
                      <span className="text-[10px] font-bold uppercase">{appointment.scheduledAt.toLocaleString(undefined, { month: "short" })}</span>
                      <span className="text-lg font-bold leading-none">{appointment.scheduledAt.getDate()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">
                        {appointment.scheduledAt.toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                        <UserRound className="size-4" />
                        {appointment.practitioner ? `${appointment.practitioner.firstName} ${appointment.practitioner.lastName}` : "Practitioner Unassigned"}
                      </p>
                      {appointment.reason && <p className="mt-2 text-sm text-slate-500">{appointment.reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[appointment.status]}`}>
                      {appointment.status.replace("_", " ")}
                    </span>
                    {appointment.status === "BOOKED" && (
                      <form action={cancelPatientAppointment}>
                        <input type="hidden" name="appointmentId" value={appointment.id} />
                        <button className="text-sm font-semibold text-red-600 hover:text-red-700" type="submit">Cancel Booking</button>
                      </form>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-montserrat text-xl font-bold text-slate-950 dark:text-white">Past Appointments</h2>
        {past.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No appointment history yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {[...past].sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime()).map((appointment) => (
              <article key={appointment.id} className="flex items-center gap-3 bg-white px-5 py-4 dark:bg-slate-950">
                <Clock3 className="size-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{appointment.scheduledAt.toLocaleString()}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{appointment.reason || "No visit reason recorded"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[appointment.status]}`}>
                  {appointment.status.replace("_", " ")}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
