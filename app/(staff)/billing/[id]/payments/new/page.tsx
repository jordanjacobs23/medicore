import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, WalletCards } from "lucide-react";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { recordPayment } from "../../../actions";

export default async function RecordPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("payment:*");
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, practiceId: session.practiceId },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      payments: { select: { amount: true } },
    },
  });
  if (!invoice) notFound();
  if (invoice.status === "DRAFT" || invoice.status === "VOID" || invoice.status === "PAID") {
    notFound();
  }

  const paid = invoice.payments.reduce(
    (total, payment) => total.add(payment.amount),
    new Prisma.Decimal(0),
  );
  const balance = invoice.amount.minus(paid);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/billing" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to billing
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]">
              <WalletCards className="size-5" />
            </div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Record payment</h1>
              <p className="mt-1 text-sm text-slate-500">
                {invoice.patient.firstName} {invoice.patient.lastName} · Balance R{balance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <form action={recordPayment} className="space-y-5 p-5 sm:px-7 sm:py-6">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Amount
              <input
                required
                type="number"
                name="amount"
                min="0.01"
                max={balance.toFixed(2)}
                step="0.01"
                inputMode="decimal"
                placeholder={balance.toFixed(2)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Payment method
              <select
                required
                name="method"
                defaultValue="CASH"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="EFT">EFT</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
          </div>
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Reference
            <input
              name="reference"
              placeholder="Optional receipt, transaction, or cheque reference"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link href="/billing" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              Cancel
            </Link>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">
              Record payment
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
