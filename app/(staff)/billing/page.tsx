import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ReceiptText, Search } from "lucide-react";
import { StatusFilter } from "./status-filter";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ISSUED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  VOID: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  OVERDUE: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requirePermission("invoice:read");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const canManage = ["PRACTICE_MANAGER", "BILLING_CLERK"].includes(session.role);
  const where = {
    practiceId: session.practiceId,
    ...(status ? { status: status as "DRAFT" | "ISSUED" | "PAID" | "VOID" | "OVERDUE" } : {}),
    ...(query
      ? {
          OR: [
            { id: { contains: query, mode: "insensitive" as const } },
            { patient: { firstName: { contains: query, mode: "insensitive" as const } } },
            { patient: { lastName: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [invoices, issued, paid, overdue] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.count({ where: { practiceId: session.practiceId, status: "ISSUED" } }),
    prisma.invoice.count({ where: { practiceId: session.practiceId, status: "PAID" } }),
    prisma.invoice.count({ where: { practiceId: session.practiceId, status: "OVERDUE" } }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Patient Accounts</p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Billing</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage invoices, payments, and patient balances.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage && (
            <>
              <Link href="/billing/claims" className="inline-flex h-11 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Claims
              </Link>
              <Link href="/billing/new" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(57,127,153,0.22)]">
                <Plus className="size-4" />
                Create invoice
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          ["Issued invoices", issued],
          ["Paid invoices", paid],
          ["Overdue invoices", overdue],
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <form className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-3 sm:flex-row dark:border-slate-800 dark:bg-slate-900/50">
          <label className="relative flex-1">
            <span className="sr-only">Search invoices</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search by invoice or patient"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#397f99] dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <StatusFilter defaultValue={status} />
        </form>

        {invoices.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ReceiptText className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:border-slate-800">
                  <th className="px-5 py-3.5">Invoice</th>
                  <th className="px-4 py-3.5">Patient</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Created</th>
                  {canManage && <th className="px-5 py-3.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#397f99]/[0.035] dark:hover:bg-[#397f99]/10">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">{invoice.id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{invoice.patient.firstName} {invoice.patient.lastName}</td>
                    <td className="px-4 py-4 font-semibold">R{invoice.amount.toFixed(2)}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[invoice.status]}`}>{invoice.status}</span></td>
                    <td className="px-4 py-4 text-slate-500">{invoice.createdAt.toLocaleDateString()}</td>
                    {canManage && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          {!["DRAFT", "VOID", "PAID"].includes(invoice.status) && (
                            <Link href={`/billing/${invoice.id}/payments/new`} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Pay</Link>
                          )}
                          <Link href={`/billing/${invoice.id}/edit`} className="font-semibold text-[#397f99] hover:underline">Edit</Link>
                        </div>
                      </td>
                    )}
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
