import { PatientCorrectionRequestStatus } from "@prisma/client";
import {
  requirePermission,
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { hasPermission } from "@/components/clinical-core/src/rbac";
import { EditPatientPersonalInformation } from "@/components/edit-patient-personal-information";
import { PatientAccountLink } from "@/components/patient-account-link";
import { PatientChart } from "@/components/patient-chart";
import { cancelPrescription } from "../../clinical/prescriptions/actions";
import { completeEncounter } from "../../clinical/actions";
import { updatePatientCorrectionRequestStatus } from "../chart-actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  ClipboardPlus,
  Mail,
  MessageSquare,
  Pill,
  Stethoscope,
} from "lucide-react";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

const formatDateOnly = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("patient:read");
  const { id } = await params;
  await requirePractitionerPatientAccess(id);
  const canReadAppointments = hasPermission(session.role, "appointment:read");
  const canReadEncounters = hasPermission(session.role, "encounter:read");
  const canReadPrescriptions = hasPermission(session.role, "prescription:read");
  const canCancelPrescriptions =
    session.role === "PRACTITIONER" &&
    hasPermission(session.role, "prescription:update");
  const canReadClinicalChart =
    hasPermission(session.role, "encounter:read") ||
    hasPermission(session.role, "observation:read") ||
    hasPermission(session.role, "vital:read");
  const canReadMedicalAid =
    hasPermission(session.role, "patient:update") ||
    hasPermission(session.role, "claim:*");
  const canUpdatePatient = hasPermission(session.role, "patient:update");
  const canAddClinicalRecords =
    canUpdatePatient || hasPermission(session.role, "observation:create");
  const canAddVitals =
    canUpdatePatient || hasPermission(session.role, "vital:create");
  const canManageMedicalAid =
    canUpdatePatient || hasPermission(session.role, "claim:*");
  const canConnectPatientAccount = hasPermission(
    session.role,
    "patient:connect_account",
  );
  const patient = await prisma.patient.findFirst({
    where: { id, practiceId: session.practiceId },
  });

  if (!patient) notFound();

  const breakGlassAccess = session.userType === "STAFF"
    ? await prisma.breakGlassRequest.findFirst({
        where: {
          practiceId: session.practiceId,
          requesterStaffId: session.userId,
          patientId: patient.id,
          status: "APPROVED",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      })
    : null;

  await logSensitiveRecordAccess(session, {
    action: "READ",
    resourceType: "PATIENT",
    resourceId: patient.id,
    metadata: breakGlassAccess
      ? { breakGlassRequestId: breakGlassAccess.id }
      : undefined,
  });

  const correctionRequestsPromise = canUpdatePatient
    ? prisma.patientCorrectionRequest.findMany({
        where: { practiceId: session.practiceId, patientId: patient.id },
        orderBy: { createdAt: "desc" },
      })
    : Promise.resolve([]);

  const [appointments, encounters, prescriptions, counts] = await Promise.all([
    canReadAppointments
      ? prisma.appointment.findMany({
          where: { patientId: id, practiceId: session.practiceId },
          orderBy: { scheduledAt: "desc" },
          include: { practitioner: true, practice: { select: { timeZone: true } } },
          take: 8,
        })
      : Promise.resolve([]),
    canReadEncounters
      ? prisma.encounter.findMany({
          where: {
            patientId: id,
            practiceId: session.practiceId,
            ...(session.role === "PRACTITIONER"
              ? { practitionerId: session.userId }
              : {}),
          },
          orderBy: { startedAt: "desc" },
          include: { practitioner: true },
          take: 6,
        })
      : Promise.resolve([]),
    canReadPrescriptions
      ? prisma.prescription.findMany({
          where: {
            patientId: id,
            encounter: {
              practiceId: session.practiceId,
              ...(session.role === "PRACTITIONER"
                ? { practitionerId: session.userId }
                : {}),
            },
          },
          orderBy: { createdAt: "desc" },
          include: { practitioner: true },
          take: 6,
        })
      : Promise.resolve([]),
    Promise.all([
      canReadAppointments
        ? prisma.appointment.count({ where: { patientId: id, practiceId: session.practiceId } })
        : Promise.resolve(0),
      canReadEncounters
        ? prisma.encounter.count({
            where: {
              patientId: id,
              practiceId: session.practiceId,
              ...(session.role === "PRACTITIONER"
                ? { practitionerId: session.userId }
                : {}),
            },
          })
        : Promise.resolve(0),
      canReadPrescriptions
        ? prisma.prescription.count({
            where: {
              patientId: id,
              encounter: {
                practiceId: session.practiceId,
                ...(session.role === "PRACTITIONER"
                  ? { practitionerId: session.userId }
                  : {}),
              },
            },
          })
        : Promise.resolve(0),
    ]),
  ]);
  const correctionRequests = await correctionRequestsPromise;

  const [
    medicalAids,
    conditions,
    allergies,
    medicationHistory,
    immunizations,
    familyHistory,
    labResults,
    vitalSigns,
  ] = await Promise.all([
    canReadMedicalAid
      ? prisma.patientMedicalAid.findMany({
          where: { patientId: id },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
          take: 20,
        })
      : Promise.resolve([]),
    canReadClinicalChart
      ? prisma.patientCondition.findMany({
          where: { patientId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canReadClinicalChart
      ? prisma.patientAllergy.findMany({
          where: { patientId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canReadClinicalChart
      ? prisma.medicationStatement.findMany({
          where: { patientId: id },
          orderBy: { recordedAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canReadClinicalChart
      ? prisma.immunization.findMany({
          where: { patientId: id },
          orderBy: { administeredAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canReadClinicalChart
      ? prisma.familyHistory.findMany({
          where: { patientId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canReadClinicalChart
      ? prisma.labResult.findMany({
          where: { patientId: id },
          orderBy: { resultAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    canReadClinicalChart
      ? prisma.vitalSign.findMany({
          where: { patientId: id },
          orderBy: { measuredAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  const initials =
    `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`.toUpperCase();

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]"
      >
        <ArrowLeft className="size-4" />
        Back to patients
      </Link>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="h-24 bg-[linear-gradient(110deg,#102b3a,#397f99_58%,#65a8bd)]" />
        <div className="-mt-12 px-5 pb-5 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex size-24 items-center justify-center rounded-2xl border-4 border-white bg-[#dcecf3] text-2xl font-bold text-[#397f99] shadow-sm dark:border-slate-950 dark:bg-[#17394a]">
                {initials}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
                    Active
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  PAT-{patient.id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <Link
                href={`/messages/${patient.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-[#397f99] hover:text-[#397f99] dark:border-slate-700 dark:text-slate-200"
              >
                <MessageSquare className="size-4" />
                Message
              </Link>
              <a
                href={`mailto:${patient.email}?subject=${encodeURIComponent("Message from your practice")}`}
                aria-label={`Email ${patient.firstName} ${patient.lastName}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-[#397f99] hover:text-[#397f99] dark:border-slate-700 dark:text-slate-200"
              >
                <Mail className="size-4" />
                Email
              </a>
              <Link
                href="/calendar"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white transition hover:bg-[#2f718a]"
              >
                <CalendarDays className="size-4" />
                Book visit
              </Link>
              {session.role === "PRACTITIONER" && (
                <Link
                  href={`/clinical/new?patientId=${patient.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#397f99] px-4 text-sm font-semibold text-[#397f99] transition hover:bg-[#397f99]/5 dark:text-sky-300"
                >
                  <Stethoscope className="size-4" />
                  New encounter / prescription
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          {canUpdatePatient ? (
            <EditPatientPersonalInformation
              patientId={patient.id}
              firstName={patient.firstName}
              lastName={patient.lastName}
              email={patient.email}
              phone={patient.phone}
              dateOfBirth={patient.dateOfBirth?.toISOString().slice(0, 10) ?? null}
            />
          ) : (
            <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Patient information
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">Email address</dt>
                  <dd className="mt-1 break-all font-medium text-slate-700 dark:text-slate-200">
                    {patient.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Phone number</dt>
                  <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
                    {patient.phone || "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Date of birth</dt>
                  <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">
                    {patient.dateOfBirth
                      ? formatDateOnly(patient.dateOfBirth)
                      : "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Patient reference</dt>
                  <dd className="mt-1 font-mono text-xs font-medium text-[#397f99]">
                    {patient.id}
                  </dd>
                </div>
              </dl>
            </article>
          )}

          {canConnectPatientAccount ? (
            <PatientAccountLink
              patientId={patient.id}
              linked={Boolean(patient.clerkId)}
              invitationPending={Boolean(patient.clerkInvitationId)}
            />
          ) : null}

          <article className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {[
              ["Visits", canReadAppointments ? counts[0] : 0],
              ["Encounters", canReadEncounters ? counts[1] : 0],
              ["Scripts", canReadPrescriptions ? counts[2] : 0],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="border-r border-slate-200 px-3 py-4 text-center last:border-r-0 dark:border-slate-800"
              >
                <p className="text-xl font-bold text-slate-950 dark:text-white">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </article>
        </aside>

        <div className="min-w-0 space-y-5">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[#397f99]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Appointments
                </h2>
              </div>
              <Link href="/calendar" className="text-xs font-bold text-[#397f99]">
                View calendar
              </Link>
            </div>
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800/80"
              >
                <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-900">
                  <span>{new Intl.DateTimeFormat("en", { timeZone: appointment.practice.timeZone, month: "short" }).format(appointment.scheduledAt)}</span>
                  <span className="text-base leading-4 text-slate-800 dark:text-slate-200">
                    {new Intl.DateTimeFormat("en", { timeZone: appointment.practice.timeZone, day: "numeric" }).format(appointment.scheduledAt)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {appointment.reason || "Clinical appointment"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("en", { timeZone: appointment.practice.timeZone, hour: "numeric", minute: "2-digit" }).format(appointment.scheduledAt)}
                    {appointment.practitioner
                      ? ` · ${appointment.practitioner.firstName} ${appointment.practitioner.lastName}`
                      : ""}
                  </p>
                </div>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  {appointment.status.replace("_", " ")}
                </span>
                <ChevronRight className="size-4 text-slate-300" />
              </div>
            ))}
            {appointments.length === 0 && (
              <EmptyState icon={CalendarDays} text="No appointments recorded" />
            )}
          </article>

          <div className="grid gap-5 xl:grid-cols-2">
            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <Stethoscope className="size-4 text-[#397f99]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Clinical encounters</h2>
              </div>
              {encounters.map((encounter) => (
                <div key={encounter.id} className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {encounter.chiefComplaint || "Clinical encounter"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(encounter.startedAt)} · {encounter.status.replace("_", " ")}
                  </p>
                  {encounter.diagnosis && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Diagnosis: {encounter.diagnosis}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {session.role === "PRACTITIONER" && encounter.status === "IN_PROGRESS" && (
                      <form action={completeEncounter}>
                        <input type="hidden" name="encounterId" value={encounter.id} />
                        <button type="submit" className="text-xs font-semibold text-[#397f99] hover:underline">
                          Sign & complete encounter
                        </button>
                      </form>
                    )}
                    {encounter.status === "COMPLETED" && hasPermission(session.role, "claim:*") && (
                      <Link href={`/billing/claims/new?encounterId=${encounter.id}`} className="text-xs font-semibold text-[#397f99] hover:underline">
                        Prepare medical-aid claim
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {encounters.length === 0 && (
                <EmptyState icon={Stethoscope} text="No encounters recorded" />
              )}
            </article>

            <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <Pill className="size-4 text-[#397f99]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Prescriptions</h2>
              </div>
              {prescriptions.map((prescription) => (
                <div key={prescription.id} className="border-b border-slate-100 px-5 py-4 last:border-0 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{prescription.medication}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {prescription.dosage} · {prescription.route ?? "Route not recorded"} · {prescription.frequency ?? "Frequency not recorded"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {prescription.duration ? `Duration ${prescription.duration} · ` : ""}
                        {prescription.quantity ? `Quantity ${prescription.quantity} · ` : ""}
                        {prescription.refills} refill{prescription.refills === 1 ? "" : "s"}
                      </p>
                      {prescription.instructions && (
                        <p className="mt-2 text-xs text-slate-500">{prescription.instructions}</p>
                      )}
                      <p className="mt-2 text-xs text-slate-400">
                        Prescribed by {prescription.practitioner.firstName} {prescription.practitioner.lastName} on {formatDate(prescription.createdAt)}. Electronic record only; not sent to a pharmacy.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{prescription.status}</span>
                  </div>
                  {canCancelPrescriptions &&
                    prescription.status === "ACTIVE" &&
                    prescription.practitionerId === session.userId && (
                      <details className="mt-3 text-xs">
                        <summary className="w-fit cursor-pointer font-semibold text-rose-700 dark:text-rose-300">
                          Cancel prescription
                        </summary>
                        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-rose-50 p-3 dark:bg-rose-950/40">
                          <p className="text-rose-800 dark:text-rose-200">
                            This marks it cancelled and keeps it in the patient record.
                          </p>
                          <form action={cancelPrescription.bind(null, prescription.id)}>
                            <input type="hidden" name="confirmCancellation" value="yes" />
                            <button type="submit" className="rounded-md bg-rose-700 px-3 py-2 font-semibold text-white hover:bg-rose-800">
                              Confirm cancellation
                            </button>
                          </form>
                        </div>
                      </details>
                    )}
                </div>
              ))}
              {prescriptions.length === 0 && (
                <EmptyState icon={Pill} text="No prescriptions recorded" />
              )}
            </article>
          </div>

          {canUpdatePatient && correctionRequests.length > 0 ? (
            <section className="mt-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Patient correction requests</h2>
                <p className="mt-1 text-xs text-slate-500">Review the patient-submitted requests and update their status and response.</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {correctionRequests.map((request) => (
                  <article key={request.id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{request.requestedFields}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{request.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{request.requestedChanges}</p>
                    <p className="text-xs text-slate-400">Received {formatDate(request.createdAt)}</p>
                    <form action={updatePatientCorrectionRequestStatus.bind(null, request.id)} className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                      <label className="text-xs font-semibold text-slate-500">Status
                        <select name="status" defaultValue={request.status} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                          {Object.values(PatientCorrectionRequestStatus).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                        </select>
                      </label>
                      <label className="text-xs font-semibold text-slate-500">Response to patient
                        <input name="reviewNote" defaultValue={request.reviewNote ?? ""} maxLength={1000} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Optional update or explanation" />
                      </label>
                      <button type="submit" className="h-10 rounded-lg bg-[#397f99] px-4 text-sm font-bold text-white">Save response</button>
                    </form>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
      {(canReadMedicalAid || canReadClinicalChart) && (
        <section className="mt-5">
          <PatientChart
            patientId={patient.id}
            showMedicalAid={canReadMedicalAid}
            showClinicalRecords={canReadClinicalChart}
            canManageMedicalAid={canManageMedicalAid}
            canAddClinicalRecords={canAddClinicalRecords}
            canAddVitals={canAddVitals}
            medicalAids={medicalAids}
            conditions={conditions}
            allergies={allergies}
            medicationHistory={medicationHistory}
            immunizations={immunizations}
            familyHistory={familyHistory}
            labResults={labResults}
            vitalSigns={vitalSigns}
          />
        </section>
      )}
    </main>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof ClipboardPlus; text: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Icon className="size-7 text-slate-300" />
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}
