import { requirePatientSelfAccess } from "@/lib/authorization/require-permission";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function PatientPortalPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return null;
  }
  await requirePatientSelfAccess(session.userId);
  const [patient, appointments, prescriptions] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: session.userId, practiceId: session.practiceId },
    }),
    prisma.appointment.findMany({
      where: {
        patientId: session.userId,
        practiceId: session.practiceId,
      },
      orderBy: { scheduledAt: "desc" },
      take: 10,
    }),
    prisma.prescription.findMany({
      where: {
        patientId: session.userId,
        encounter: { practiceId: session.practiceId },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!patient) {
    return null;
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">Patient portal</h1>
      <p className="mt-2 text-slate-500">
        Welcome, {patient.firstName} {patient.lastName}
      </p>
      <section className="mt-8 rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold">Appointments</h2>
        {appointments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No appointments recorded.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {appointments.map((appointment) => (
              <li key={appointment.id} className="text-sm">
                {appointment.scheduledAt.toLocaleString()} - {appointment.status}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-4 rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold">Prescriptions</h2>
        {prescriptions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No prescriptions recorded.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {prescriptions.map((prescription) => (
              <li key={prescription.id} className="text-sm">
                {prescription.medication} - {prescription.dosage}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}