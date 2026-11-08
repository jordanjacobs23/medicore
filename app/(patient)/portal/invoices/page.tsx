import Link from "next/link";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { Prisma } from "@prisma/client";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ISSUED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  VOID: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  OVERDUE: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export default async function PatientInvoicesPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;

  const invoices = await prisma.invoice.findMany({
    where: { practiceId: session.practiceId, patientId: session.userId },
    include: { payments: { select: { amount: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-[#397f99] mt-15">
        <ArrowLeft className="size-4" />
        Back to portal
      </Link>
      <div className="mt-4">
        <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Invoices</h1>
        <p className="mt-2 text-sm text-slate-500">Review your invoices, payment status, and balances.</p>
      </div>

      {invoices.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-5 py-14 text-center dark:border-slate-700">
          <ReceiptText className="mx-auto size-9 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No invoices found</p>
        </div>
      ) : (
        <section className="mt-8 space-y-3">
          {invoices.map((invoice) => {
            const paid = invoice.payments.reduce((total, payment) => total.add(payment.amount), new Prisma.Decimal(0));
            const balance = invoice.amount.minus(paid);
            return (
              <article key={invoice.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-mono text-xs font-semibold text-[#397f99]">INV-{invoice.id.slice(-8).toUpperCase()}</p>
                  <p className="mt-2 font-semibold text-slate-950 dark:text-white">R{invoice.amount.toFixed(2)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Issued {invoice.createdAt.toLocaleDateString()}
                    {invoice.dueDate ? ` · Due ${invoice.dueDate.toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[invoice.status]}`}>{invoice.status}</span>
                  <p className={`mt-0 text-sm font-semibold sm:mt-3 ${balance.gt(0) ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {balance.gt(0) ? `Balance R${balance.toFixed(2)}` : "Paid in full"}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
