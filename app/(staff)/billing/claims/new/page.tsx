import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { createClaim } from "../../actions";

export default async function NewClaimPage() {
  const session = await requirePermission("claim:*");
  const patients = await prisma.patient.findMany({
    where: { practiceId: session.practiceId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });
  const invoices = await prisma.invoice.findMany({
    where: { practiceId: session.practiceId, status: { not: "VOID" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, patientId: true, amount: true },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/billing/claims" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft className="size-4" />Back to claims</Link>
      <section className="mt-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b px-5 py-5 dark:border-slate-800"><h1 className="font-montserrat text-2xl font-bold">Create claim</h1></div>
        <form action={createClaim} className="space-y-5 p-5 sm:p-7">
          <label className="space-y-2 text-sm font-semibold">Patient
            <select required name="patientId" defaultValue="" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950">
              <option value="" disabled>Select a patient</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold">Related invoice (optional)
            <select name="invoiceId" defaultValue="" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950">
              <option value="">No related invoice</option>
              {invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.id.slice(-8).toUpperCase()} · {patients.find((patient) => patient.id === invoice.patientId)?.firstName} · R{invoice.amount.toFixed(2)}</option>)}
            </select>
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold">Payer<input required name="payer" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" /></label>
            <label className="space-y-2 text-sm font-semibold">Claim number<input name="claimNumber" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" /></label>
          </div>
          <label className="space-y-2 text-sm font-semibold">Amount<input required type="number" name="amount" min="0.01" step="0.01" className="h-11 w-full rounded-lg border px-3 dark:bg-slate-950" /></label>
          <div className="flex justify-end gap-3 border-t pt-5 dark:border-slate-800">
            <Link href="/billing/claims" className="h-10 rounded-lg border px-4 pt-2 text-sm font-semibold">Cancel</Link>
            <button type="submit" className="h-10 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">Create claim</button>
          </div>
        </form>
      </section>
    </main>
  );
}
