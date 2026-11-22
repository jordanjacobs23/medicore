import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { recordClaimResponse, updateClaimDetails } from "../../../actions";
import { ClaimLineFields } from "@/components/claim-line-fields";

const editableStatuses = ["DRAFT", "REJECTED", "DENIED"];
const awaitingResponseStatuses = ["SUBMITTED", "RESUBMITTED", "ACKNOWLEDGED", "PENDING"];

export default async function EditClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("claim:*");
  const { id } = await params;
  const claim = await prisma.claim.findFirst({
    where: { id, practiceId: session.practiceId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      invoice: { include: { lines: { orderBy: { id: "asc" } } } },
      events: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!claim) notFound();
  await logSensitiveRecordAccess(session, {
    resourceType: "BILLING_CLAIM",
    resourceId: claim.id,
    metadata: { patientId: claim.patientId },
  });

  const canEdit = editableStatuses.includes(claim.status);
  const canRecordResponse = awaitingResponseStatuses.includes(claim.status);
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/billing/claims" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
        <ArrowLeft className="size-4" />Back to claims
      </Link>
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b px-5 py-5 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397f99]">Medical-aid claim</p>
          <h1 className="mt-1 font-montserrat text-2xl font-bold">{claim.claimNumber || claim.id.slice(-8).toUpperCase()}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {claim.patient.firstName} {claim.patient.lastName} · {claim.payer} · {claim.status}
          </p>
          {claim.switchingRef && <p className="mt-1 text-xs text-slate-500">Switching reference: {claim.switchingRef}</p>}
          {claim.rejectReason && (
            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              Rejection reason: {claim.rejectReason}
            </p>
          )}
        </div>

        <form action={updateClaimDetails} className="space-y-5 p-5 sm:p-7">
          <input type="hidden" name="claimId" value={claim.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-semibold">
              Scheme / payer
              <input required name="payer" defaultValue={claim.payer} readOnly={!canEdit} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Claim number
              <input name="claimNumber" defaultValue={claim.claimNumber ?? ""} readOnly={!canEdit} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Scheme code
              <input name="schemeCode" defaultValue={claim.schemeCode ?? ""} readOnly={!canEdit} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Membership number
              <input name="memberNumber" defaultValue={claim.memberNumber ?? ""} readOnly={!canEdit} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Dependant code
              <input name="dependantCode" defaultValue={claim.dependantCode ?? ""} readOnly={!canEdit} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
            </label>
          </div>

          {claim.invoice ? (
            <fieldset className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2">
              <legend className="px-1 text-sm font-bold">Invoice coding and shares</legend>
              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                {canEdit
                  ? "Review and edit the coded invoice lines before submission or resubmission. The invoice and scheme share recalculate when saved."
                  : "Submitted code and amount details are locked to preserve the claim that was sent."}
              </p>
              <ClaimLineFields
                initialLines={claim.invoice.lines.map((line) => ({
                  id: line.id,
                  tariffCode: line.tariffCode,
                  icd10Code: line.icd10Code ?? "",
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice.toFixed(2),
                  modifierCodes: line.modifierCodes.join(", "),
                }))}
                readOnly={!canEdit}
              />
              <label className="block space-y-2 text-sm font-semibold">
                Patient share (R)
                <input type="number" name="patientShare" min="0" step="0.01" defaultValue={claim.invoice.patientShare.toFixed(2)} readOnly={!canEdit} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
              </label>
              <div className="self-end pb-3 text-sm text-slate-600 dark:text-slate-300">
                Invoice total R{claim.invoice.amount.toFixed(2)} · Scheme claim R{claim.amount.toFixed(2)}
              </div>
            </fieldset>
          ) : (
            <label className="block space-y-2 text-sm font-semibold">
              Legacy claim amount
              <input required type="number" name="amount" min="0.01" step="0.01" defaultValue={claim.amount.toFixed(2)} readOnly={!canEdit} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
            </label>
          )}
          {canEdit && (
            <div className="flex justify-end border-t pt-5 dark:border-slate-800">
              <button type="submit" className="h-10 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">Save reviewed claim</button>
            </div>
          )}
        </form>

        {canRecordResponse && (
          <form action={recordClaimResponse} className="space-y-4 border-t p-5 sm:p-7 dark:border-slate-800">
            <input type="hidden" name="claimId" value={claim.id} />
            <div>
              <h2 className="font-semibold">Record scheme response</h2>
              <p className="mt-1 text-xs text-slate-500">No live scheme connection is configured; enter an out-of-band response here.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm font-semibold">
                Response status
                <select required name="status" defaultValue="" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950">
                  <option value="" disabled>Select response</option>
                  {["ACKNOWLEDGED", "PENDING", "APPROVED", "PARTIALLY_APPROVED", "REJECTED", "PAID", "WRITTEN_OFF"].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Amount authorised (R)
                <input type="number" name="amountAuthorised" min="0" step="0.01" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Amount paid (R)
                <input type="number" name="amountPaid" min="0" step="0.01" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" />
              </label>
              <label className="block space-y-2 text-sm font-semibold sm:col-span-2">
                Rejection reason
                <textarea name="rejectReason" rows={2} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
              </label>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="h-10 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">Save response</button>
            </div>
          </form>
        )}

        <section className="border-t p-5 dark:border-slate-800 sm:p-7">
          <h2 className="font-semibold">Claim history</h2>
          {claim.events.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No claim events recorded.</p>
          ) : (
            <ol className="mt-3 space-y-3">
              {claim.events.map((event) => (
                <li key={event.id} className="border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{event.type} · {event.createdAt.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-500">{event.description}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>
    </main>
  );
}
