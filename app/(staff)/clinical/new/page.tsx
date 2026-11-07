import Link from "next/link";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { createEncounter } from "../actions";

export default async function NewEncounterPage() {
  const session = await requirePermission("encounter:create");
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
    select: { id: true, firstName: true, lastName: true },
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
              <select required name="patientId" defaultValue="" className={inputClass}>
                <option value="" disabled>Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Chief complaint
              <textarea required name="chiefComplaint" rows={3} className={inputClass} placeholder="Reason for the visit" />
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

          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-slate-900 dark:text-white">Assessment and plan</legend>
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
            <legend className="px-1 text-sm font-bold text-slate-900 dark:text-white">Prescription</legend>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Medication
              <input name="medication" className={inputClass} placeholder="Medication name" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Dosage
              <input name="dosage" className={inputClass} placeholder="e.g. 500 mg twice daily" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Instructions
              <textarea name="instructions" rows={3} className={inputClass} placeholder="Optional administration instructions" />
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
