import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { checkClaimStatus, resubmitClaimToScheme, submitClaimToScheme } from "../actions";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-50 text-blue-700",
  ACKNOWLEDGED: "bg-sky-50 text-sky-700",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  PARTIALLY_APPROVED: "bg-emerald-50 text-emerald-700",
  DENIED: "bg-red-50 text-red-700",
  REJECTED: "bg-red-50 text-red-700",
  RESUBMITTED: "bg-blue-50 text-blue-700",
  PAID: "bg-teal-50 text-teal-700",
  CLOSED: "bg-slate-100 text-slate-700",
  WRITTEN_OFF: "bg-slate-100 text-slate-700",
};

export default async function ClaimsPage() {
  const session = await requirePermission("claim:*");
  const claims = await prisma.claim.findMany({
    where: { practiceId: session.practiceId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      invoice: { select: { status: true, lines: { select: { icd10Code: true, tariffCode: true } } } },
      events: { orderBy: { createdAt: "desc" }, take: 1, select: { type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Billing</p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Claims</h1>
          <p className="mt-2 text-sm text-slate-500">Review coded claims, submit through the adapter, and track scheme responses.</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">The current adapter simulates acknowledgement only; it does not send claims to Healthbridge or a scheme.</p>
        </div>
        <Link href="/billing/claims/new" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">
          <Plus className="size-4" /> Create claim
        </Link>
      </div>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        {claims.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-slate-500">No claims have been created.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead><tr className="border-b text-[10px] uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-3.5">Claim</th><th className="px-4 py-3.5">Patient</th><th className="px-4 py-3.5">Payer</th><th className="px-4 py-3.5">Amount</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-slate-800">
                {claims.map((claim) => {
                  const hasCodedInvoice = Boolean(
                    claim.invoice &&
                    claim.invoice.status !== "VOID" &&
                    claim.invoice.lines.length &&
                    claim.invoice.lines.every((line) => line.tariffCode) &&
                    claim.invoice.lines.some((line) => line.icd10Code),
                  );
                  const hasMembership = Boolean(claim.schemeCode && claim.memberNumber);
                  const canSubmit = claim.status === "DRAFT" && hasCodedInvoice && hasMembership;
                  const canResubmit =
                    ["REJECTED", "DENIED"].includes(claim.status) &&
                    claim.events[0]?.type === "DETAILS_UPDATED" &&
                    hasCodedInvoice &&
                    hasMembership;

                  return (
                  <tr key={claim.id}>
                    <td className="px-5 py-4 font-mono text-xs">{claim.claimNumber || claim.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-4 font-semibold">{claim.patient.firstName} {claim.patient.lastName}</td>
                    <td className="px-4 py-4">{claim.payer}</td>
                    <td className="px-4 py-4 font-semibold">R{claim.amount.toFixed(2)}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[claim.status]}`}>{claim.status}</span></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-3">
                        {canSubmit && (
                          <form action={submitClaimToScheme}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <button type="submit" className="font-semibold text-[#397f99] hover:underline">Submit (simulation)</button>
                          </form>
                        )}
                        {claim.status === "DRAFT" && !canSubmit ? (
                          <span className="text-xs text-slate-500">Needs coded invoice and membership details</span>
                        ) : null}
                        {canResubmit && (
                          <form action={resubmitClaimToScheme}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <button type="submit" className="font-semibold text-[#397f99] hover:underline">Resubmit (simulation)</button>
                          </form>
                        )}
                        {["REJECTED", "DENIED"].includes(claim.status) && !canResubmit && (
                          <span className="text-xs text-slate-500">Review and save corrections to resubmit</span>
                        )}
                        {["SUBMITTED", "RESUBMITTED", "ACKNOWLEDGED", "PENDING"].includes(claim.status) && (
                          <form action={checkClaimStatus}>
                            <input type="hidden" name="claimId" value={claim.id} />
                            <button type="submit" className="font-semibold text-[#397f99] hover:underline">Check status (simulation)</button>
                          </form>
                        )}
                        <Link href={`/billing/claims/${claim.id}/edit`} className="font-semibold text-[#397f99] hover:underline">
                          { ["SUBMITTED", "RESUBMITTED", "ACKNOWLEDGED", "PENDING"].includes(claim.status) ? "Record response" : "Details" }
                        </Link>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
