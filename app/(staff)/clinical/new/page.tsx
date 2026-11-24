import Link from "next/link";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createEncounter } from "../actions";
import { AiScribePanel } from "@/components/ai-scribe-panel";
import { PatientSearchSelect } from "@/components/patient-search-select";

export default async function NewEncounterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requirePermission("encounter:create");
  const searchParamsValue = await searchParams;
  const requestedPatientId =
    typeof searchParamsValue.patientId === "string"
      ? searchParamsValue.patientId
      : undefined;
  const patients = await prisma.patient.findMany({
    where: {
      practiceId: session.practiceId,
      OR: [
        { appointments: { some: { practitionerId: session.userId } } },
        { encounters: { some: { practitionerId: session.userId } } },
        { prescriptions: { some: { practitionerId: session.userId } } },
      ],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
  });
  await logSensitiveRecordAccess(session, {
    resourceType: "CLINICAL_PATIENT_SELECTION",
    metadata: { patientCount: patients.length },
  });
  const selectedPatientId = patients.some(
    (patient) => patient.id === requestedPatientId,
  )
    ? requestedPatientId
    : "";
  const drugCatalog = await prisma.drugCatalog.findMany({
    where: { practiceId: session.practiceId, isActive: true },
    orderBy: [{ name: "asc" }, { strength: "asc" }],
  });

  const inputClass =
    "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/clinical" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to clinical workspace
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">New encounter</h1>
              <p className="mt-1 text-sm text-slate-500">Record care details, findings, diagnosis, notes, and treatment.</p>
            </div>
          </div>
        </div>

        <form action={createEncounter} className="space-y-7 p-5 sm:p-7">
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-slate-900 dark:text-white">Encounter</legend>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Patient
              <PatientSearchSelect
                patients={patients.map((patient) => ({
                  ...patient,
                  dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
                }))}
                defaultPatientId={selectedPatientId}
                required
                inputClass={inputClass}
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Chief complaint
              <textarea required name="chiefComplaint" rows={3} className={inputClass} placeholder="Reason for the visit" />
            </label>
            <AiScribePanel patientId={selectedPatientId} />
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Record sensitivity
              <select name="sensitivity" defaultValue="NORMAL" className={inputClass}>
                <option value="NORMAL">Normal</option>
                <option value="SENSITIVE">Sensitive</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2">
            <legend className="px-1 text-sm font-bold text-slate-900 dark:text-white">Observation</legend>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Type
              <select name="observationType" defaultValue="VITAL" className={inputClass}>
                <option value="VITAL">Vital</option>
                <option value="LAB">Lab</option>
                <option value="NOTE">Note</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Name
              <input name="observationName" className={inputClass} placeholder="Blood pressure" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Value
              <input name="observationValue" className={inputClass} placeholder="120/80" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Unit
              <input name="observationUnit" className={inputClass} placeholder="mmHg" />
            </label>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="text-sm font-bold text-slate-900 dark:text-white">SOAP assessment</legend>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Subjective
              <textarea name="subjective" rows={4} className={inputClass} placeholder="Patient-reported symptoms and history" />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Objective
              <textarea name="objective" rows={4} className={inputClass} placeholder="Exam findings and observed data" />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Assessment
              <textarea name="assessment" rows={4} className={inputClass} placeholder="Clinical impression" />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Plan
              <textarea name="plan" rows={4} className={inputClass} placeholder="Treatment and follow-up plan" />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Diagnosis
              <input name="diagnosis" className={inputClass} placeholder="Primary diagnosis or clinical impression" />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Clinical notes
              <textarea name="notes" rows={5} className={inputClass} placeholder="Progress notes, findings, and care plan" />
            </label>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2">
            <legend className="px-1 text-sm font-bold text-slate-900 dark:text-white">Electronic prescription record</legend>
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
              Catalog selection enables allergy and interaction checks. Severe or contraindicated interactions and matching active allergies block saving.
            </p>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Drug catalog
              <select name="drugCatalogId" className={inputClass} defaultValue="">
                <option value="">Free-text medication (catalog check unavailable)</option>
                {drugCatalog.map((drug) => (
                  <option key={drug.id} value={drug.id}>
                    {drug.name}{drug.genericName ? ` (${drug.genericName})` : ""}{drug.strength ? ` · ${drug.strength}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Medication
              <input name="medication" maxLength={250} className={inputClass} placeholder="Medication name and strength" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Dose per administration
              <input name="dosage" maxLength={250} className={inputClass} placeholder="e.g. 1 tablet (500 mg)" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Route
              <input name="route" maxLength={100} className={inputClass} placeholder="e.g. oral" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Frequency
              <input name="frequency" maxLength={150} className={inputClass} placeholder="e.g. twice daily, as needed" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Duration <span className="font-normal text-slate-400">(optional)</span>
              <input name="duration" maxLength={100} className={inputClass} placeholder="e.g. 7 days" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Quantity
              <input name="quantity" maxLength={100} className={inputClass} placeholder="e.g. 14 tablets, 100 mL" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Refills
              <input name="refills" type="number" min="0" max="99" step="1" defaultValue="0" className={inputClass} />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Additional instructions <span className="font-normal text-slate-400">(optional)</span>
              <textarea name="instructions" maxLength={1000} rows={3} className={inputClass} placeholder="Administration or patient instructions" />
            </label>
          </fieldset>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link href="/clinical" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</Link>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">Create encounter</button>
          </div>
        </form>
      </section>
    </main>
  );
}
