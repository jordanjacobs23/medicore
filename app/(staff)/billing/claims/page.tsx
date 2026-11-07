import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { ClaimStatusFilter } from "./status-filter";
import { updateClaimStatus } from "../actions";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-50 text-blue-700",
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  DENIED: "bg-red-50 text-red-700",
  PAID: "bg-teal-50 text-teal-700",
  CLOSED: "bg-slate-100 text-slate-700",
};

export default async function ClaimsPage() {
  const session = await requirePermission("claim:*");
  const claims = await prisma.claim.findMany({
    where: { practiceId: session.practiceId },
    include: { patient: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Billing</p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Claims</h1>
          <p className="mt-2 text-sm text-slate-500">Create, submit, and track insurance claims.</p>
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
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead><tr className="border-b text-[10px] uppercase tracking-[0.14em] text-slate-400">
                <th className="px-5 py-3.5">Claim</th><th className="px-4 py-3.5">Patient</th><th className="px-4 py-3.5">Payer</th><th className="px-4 py-3.5">Amount</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5">Update</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-slate-800">
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-5 py-4 font-mono text-xs">{claim.claimNumber || claim.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-4 font-semibold">{claim.patient.firstName} {claim.patient.lastName}</td>
                    <td className="px-4 py-4">{claim.payer}</td>
                    <td className="px-4 py-4 font-semibold">R{claim.amount.toFixed(2)}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[claim.status]}`}>{claim.status}</span></td>
                    <td className="px-5 py-4">
                      <form action={updateClaimStatus} className="flex items-center gap-2">
                        <input type="hidden" name="claimId" value={claim.id} />
                        <ClaimStatusFilter defaultValue={claim.status} />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
