import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createClaimFromEncounter } from "../../actions";
import { ClaimLineFields } from "@/components/claim-line-fields";

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requirePermission("claim:*");
  const query = await searchParams;
  const requestedEncounterId = typeof query.encounterId === "string" ? query.encounterId : "";
  const encounters = await prisma.encounter.findMany({
    where: {
      practiceId: session.practiceId,
      status: "COMPLETED",
      signedAt: { not: null },
      claims: { none: {} },
      ...(session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {}),
    },
    orderBy: { startedAt: "desc" },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          medicalAids: {
            where: { isPrimary: true },
            select: {
              schemeName: true,
              schemeCode: true,
              membershipNumber: true,
              dependantCode: true,
            },
            take: 1,
          },
        },
      },
    },
  });
  await logSensitiveRecordAccess(session, {
    resourceType: "BILLING_CLAIM_ENCOUNTER_SELECTION",
    metadata: { encounterCount: encounters.length },
  });
  const selectedEncounter = encounters.find((item) => item.id === requestedEncounterId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/billing/claims" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
        <ArrowLeft className="size-4" />Back to claims
      </Link>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b px-5 py-5 dark:border-slate-800">
          <h1 className="font-montserrat text-2xl font-bold">Prepare claim</h1>
          <p className="mt-2 text-sm text-slate-500">
            Select a completed encounter, review the diagnosis and tariff codes, then create a draft coded invoice and claim.
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Codes are entered by staff for review. The ICD-10-ZA and NHRPL suggestion catalogs are not configured in this project yet.
          </p>
        </div>
        {encounters.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No unclaimed completed encounters are available. Complete an encounter from the patient chart first.
            <div className="mt-3"><Link href="/patients" className="font-semibold text-[#397f99] hover:underline">Find a patient</Link></div>
          </div>
        ) : (
          <form action={createClaimFromEncounter} className="space-y-5 p-5 sm:p-7">
            <label className="block space-y-2 text-sm font-semibold">
              Completed encounter
              <select required name="encounterId" defaultValue={selectedEncounter?.id ?? ""} className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950">
                <option value="" disabled>Select an encounter</option>
                {encounters.map((encounter) => (
                  <option key={encounter.id} value={encounter.id}>
                    {encounter.patient.firstName} {encounter.patient.lastName} · {encounter.startedAt.toLocaleDateString()} · {encounter.chiefComplaint || "Encounter"}
                  </option>
                ))}
              </select>
            </label>

            {selectedEncounter && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-900">
                <p className="font-semibold">{selectedEncounter.patient.firstName} {selectedEncounter.patient.lastName}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Diagnosis: {selectedEncounter.diagnosis || "No diagnosis recorded"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Current cover: {selectedEncounter.patient.medicalAids[0]?.schemeName ?? "Not recorded"}
                </p>
              </div>
            )}

            <fieldset className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2">
              <legend className="px-1 text-sm font-bold">Medical-aid details</legend>
              <label className="block space-y-2 text-sm font-semibold">
                Scheme / payer
                <input required name="payer" defaultValue={selectedEncounter?.patient.medicalAids[0]?.schemeName ?? ""} className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Scheme code
                <input name="schemeCode" defaultValue={selectedEncounter?.patient.medicalAids[0]?.schemeCode ?? ""} className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Membership number
                <input required name="memberNumber" defaultValue={selectedEncounter?.patient.medicalAids[0]?.membershipNumber ?? ""} className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Dependant code
                <input name="dependantCode" defaultValue={selectedEncounter?.patient.medicalAids[0]?.dependantCode ?? ""} className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" />
              </label>
            </fieldset>

            <fieldset className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2">
              <legend className="px-1 text-sm font-bold">Reviewed billing lines</legend>
              <ClaimLineFields defaultDescription={selectedEncounter?.diagnosis ?? selectedEncounter?.chiefComplaint ?? ""} />
              <label className="block space-y-2 text-sm font-semibold">
                Patient share (R)
                <input type="number" name="patientShare" min="0" step="0.01" defaultValue="0.00" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" />
              </label>
              <p className="self-end pb-3 text-xs text-slate-500">
                Scheme share is calculated as the invoice total minus the patient share.
              </p>
            </fieldset>

            <div className="flex justify-end gap-3 border-t pt-5 dark:border-slate-800">
              <Link href="/billing/claims" className="h-10 rounded-lg border px-4 pt-2 text-sm font-semibold">Cancel</Link>
              <button type="submit" className="h-10 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">Create draft claim</button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
