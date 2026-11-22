import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  Clock3,
  CreditCard,
  FileClock,
  HeartPulse,
  ReceiptText,
  Stethoscope,
  WalletCards,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/authorization/require-permission";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  addDaysToDateKey,
  dateTimeInTimeZone,
  getLocalDateKey,
  parseDateKey,
} from "@/lib/appointments/availability";

const money = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
});

const appointmentStatuses = ["BOOKED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
const paymentMethodNames: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  EFT: "EFT",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
  MEDICAL_AID: "Medical aid",
};
const reportAccents = {
  sky: {
    border: "border-t-sky-500 dark:border-t-sky-400",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300",
  },
  emerald: {
    border: "border-t-emerald-500 dark:border-t-emerald-400",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
  },
  violet: {
    border: "border-t-violet-500 dark:border-t-violet-400",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300",
  },
  amber: {
    border: "border-t-amber-500 dark:border-t-amber-400",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
  },
  rose: {
    border: "border-t-rose-500 dark:border-t-rose-400",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
  },
  cyan: {
    border: "border-t-cyan-500 dark:border-t-cyan-400",
    icon: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300",
  },
} as const;

const appointmentStatusColors: Record<(typeof appointmentStatuses)[number], string> = {
  BOOKED: "bg-sky-500",
  ARRIVED: "bg-amber-500",
  IN_PROGRESS: "bg-violet-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-slate-400",
  NO_SHOW: "bg-rose-500",
};

const claimStatusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SUBMITTED: "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300",
  RESUBMITTED: "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300",
  ACKNOWLEDGED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300",
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300",
  PARTIALLY_APPROVED: "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-950/70 dark:text-green-300",
  DENIED: "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300",
  CLOSED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  WRITTEN_OFF: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const agingLabelColors = [
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
];

type AgingBucket = {
  label: string;
  minimumDays: number;
  maximumDays: number | null;
  count: number;
  balance: number;
};

function newAgingBuckets(): AgingBucket[] {
  return [
    { label: "0–30 days", minimumDays: 0, maximumDays: 30, count: 0, balance: 0 },
    { label: "31–60 days", minimumDays: 31, maximumDays: 60, count: 0, balance: 0 },
    { label: "61–90 days", minimumDays: 61, maximumDays: 90, count: 0, balance: 0 },
    { label: "90+ days", minimumDays: 91, maximumDays: null, count: 0, balance: 0 },
  ];
}

function assignAgingBucket(buckets: AgingBucket[], date: Date, asOf: Date, balance: number) {
  const days = Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / 86_400_000));
  const bucket = buckets.find((row) =>
    days >= row.minimumDays && (row.maximumDays === null || days <= row.maximumDays),
  );
  if (bucket) {
    bucket.count += 1;
    bucket.balance += balance;
  }
}

function dateLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function ReportSection({
  icon: Icon,
  accent,
  title,
  description,
  children,
}: {
  icon: typeof Activity;
  accent: keyof typeof reportAccents;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const colors = reportAccents[accent];
  return (
    <section className={`overflow-hidden rounded-2xl border border-t-2 border-slate-200 ${colors.border} bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950`}>
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>
            <Icon className="size-5" />
          </span>
          <div>
            <h2 className="font-montserrat text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

function formatStatus(status: string) {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requirePermission("report:read");
  const canViewBilling = ["PRACTICE_MANAGER", "BILLING_CLERK"].includes(session.role);
  const canViewCalendar = session.role === "PRACTICE_MANAGER";
  const params = await searchParams;
  const practice = await prisma.practice.findUnique({
    where: { id: session.practiceId },
    select: { timeZone: true },
  });
  const timeZone = practice?.timeZone ?? "Africa/Johannesburg";
  const todayKey = getLocalDateKey(new Date(), timeZone);
  const defaultFrom = `${todayKey.slice(0, 7)}-01`;
  let from = params.from?.trim() || defaultFrom;
  let to = params.to?.trim() || todayKey;

  try {
    parseDateKey(from);
    parseDateKey(to);
    if (from > to) throw new Error("The report start date must come before the end date.");
  } catch {
    from = defaultFrom;
    to = todayKey;
  }

  const rangeStart = dateTimeInTimeZone(from, "00:00", timeZone);
  const rangeEnd = dateTimeInTimeZone(addDaysToDateKey(to, 1), "00:00", timeZone);
  const dateRange = { gte: rangeStart, lt: rangeEnd };
  const reportableInvoiceWhere: Prisma.InvoiceWhereInput = {
    practiceId: session.practiceId,
    createdAt: dateRange,
    status: { notIn: ["DRAFT", "VOID"] },
  };
  const reportableLineWhere: Prisma.InvoiceLineWhereInput = {
    invoice: reportableInvoiceWhere,
  };
  const paidPeriodWhere: Prisma.PaymentWhereInput = {
    practiceId: session.practiceId,
    recordedAt: dateRange,
  };

  const collectionMonths = Array.from({ length: 6 }, (_, index) => {
    const [year, month] = todayKey.slice(0, 7).split("-").map(Number);
    const monthDate = new Date(Date.UTC(year, month - 1 - (5 - index), 1));
    const startKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const endMonth = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));
    const endKey = `${endMonth.getUTCFullYear()}-${String(endMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;
    return {
      label: monthDate.toLocaleDateString("en-ZA", { month: "short", year: "numeric", timeZone: "UTC" }),
      where: {
        gte: dateTimeInTimeZone(startKey, "00:00", timeZone),
        lt: dateTimeInTimeZone(endKey, "00:00", timeZone),
      },
    };
  });

  const [
    patientCount,
    activeStaffCount,
    completedVisits,
    appointmentStatusGroups,
    selectedInvoiceTotals,
    selectedPaymentTotals,
    paymentsByPayer,
    paymentsByMethod,
    monthlyCollections,
    icdFrequencyGroups,
    serviceIncomeGroups,
    visitsByPractitionerGroups,
    practitioners,
    claimsByStatus,
    openClaims,
    outstandingInvoices,
  ] = await Promise.all([
    prisma.patient.count({ where: { practiceId: session.practiceId } }),
    prisma.staff.count({ where: { practiceId: session.practiceId, isActive: true } }),
    prisma.encounter.count({
      where: { practiceId: session.practiceId, status: "COMPLETED", startedAt: dateRange },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { practiceId: session.practiceId, scheduledAt: dateRange },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({ where: reportableInvoiceWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: paidPeriodWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.groupBy({
      by: ["payerType"],
      where: paidPeriodWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: paidPeriodWhere,
      _sum: { amount: true },
      _count: { _all: true },
    }),
    Promise.all(collectionMonths.map(({ where }) => prisma.payment.aggregate({
      where: { practiceId: session.practiceId, recordedAt: where },
      _sum: { amount: true },
    }))),
    prisma.invoiceLine.groupBy({
      by: ["icd10Code"],
      where: {
        ...reportableLineWhere,
        icd10Code: { not: null },
        NOT: { icd10Code: "" },
      },
      _count: { _all: true },
      _sum: { quantity: true, amount: true },
    }),
    prisma.invoiceLine.groupBy({
      by: ["tariffCode", "description"],
      where: reportableLineWhere,
      _count: { _all: true },
      _sum: { quantity: true, amount: true },
    }),
    prisma.encounter.groupBy({
      by: ["practitionerId"],
      where: { practiceId: session.practiceId, status: "COMPLETED", startedAt: dateRange },
      _count: { _all: true },
    }),
    prisma.staff.findMany({
      where: { practiceId: session.practiceId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.claim.groupBy({
      by: ["status"],
      where: { practiceId: session.practiceId, createdAt: dateRange },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.claim.findMany({
      where: {
        practiceId: session.practiceId,
        status: { in: ["SUBMITTED", "RESUBMITTED", "ACKNOWLEDGED", "PENDING", "APPROVED", "PARTIALLY_APPROVED"] },
      },
      select: { amount: true, amountAuthorised: true, amountPaid: true, submittedAt: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { practiceId: session.practiceId, status: { in: ["ISSUED", "OVERDUE"] } },
      select: { amount: true, dueDate: true, createdAt: true, payments: { select: { amount: true } } },
    }),
  ]);
  await logSensitiveRecordAccess(session, {
    resourceType: "STAFF_REPORT",
    metadata: {
      patientCount,
      openClaimCount: openClaims.length,
      outstandingInvoiceCount: outstandingInvoices.length,
    },
  });

  const appointmentCounts = new Map(appointmentStatusGroups.map((row) => [row.status, row._count._all]));
  const appointmentTotal = appointmentStatusGroups.reduce((sum, row) => sum + row._count._all, 0);
  const invoicedAmount = selectedInvoiceTotals._sum.amount?.toNumber() ?? 0;
  const collectedAmount = selectedPaymentTotals._sum.amount?.toNumber() ?? 0;

  const invoiceAging = newAgingBuckets();
  for (const invoice of outstandingInvoices) {
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const balance = Math.max(0, invoice.amount.toNumber() - paid);
    if (balance > 0) assignAgingBucket(invoiceAging, invoice.dueDate ?? invoice.createdAt, new Date(), balance);
  }

  const claimAging = newAgingBuckets();
  for (const claim of openClaims) {
    const authorised = claim.amountAuthorised?.toNumber() ?? claim.amount.toNumber();
    const paid = claim.amountPaid?.toNumber() ?? 0;
    const balance = Math.max(0, authorised - paid);
    if (balance > 0) assignAgingBucket(claimAging, claim.submittedAt ?? claim.createdAt, new Date(), balance);
  }

  const totalInvoiceBalance = invoiceAging.reduce((sum, row) => sum + row.balance, 0);
  const totalClaimBalance = claimAging.reduce((sum, row) => sum + row.balance, 0);
  const practitionerNames = new Map(practitioners.map((person) => [person.id, `${person.firstName} ${person.lastName}`]));
  const practitionerVisitRows = visitsByPractitionerGroups
    .map((row) => ({ name: practitionerNames.get(row.practitionerId) ?? "Inactive practitioner", count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const icdRows = icdFrequencyGroups
    .filter((row) => Boolean(row.icd10Code?.trim()))
    .map((row) => ({
      code: row.icd10Code!,
      frequency: row._count._all,
      units: row._sum.quantity ?? 0,
      amount: row._sum.amount?.toNumber() ?? 0,
    }))
    .sort((a, b) => b.frequency - a.frequency || a.code.localeCompare(b.code))
    .slice(0, 10);
  const serviceRows = serviceIncomeGroups
    .map((row) => ({
      code: row.tariffCode,
      description: row.description,
      units: row._sum.quantity ?? 0,
      amount: row._sum.amount?.toNumber() ?? 0,
      count: row._count._all,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  const collectionRows = collectionMonths.map((month, index) => ({
    label: month.label,
    amount: monthlyCollections[index]._sum.amount?.toNumber() ?? 0,
  }));
  const maxMonthlyCollection = Math.max(0, ...collectionRows.map((row) => row.amount));

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Practice operations</p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Practice reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Visits, billing, claims, and clinical coding for {dateLabel(rangeStart, timeZone)}–{dateLabel(new Date(rangeEnd.getTime() - 1), timeZone)}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canViewCalendar && <Link href="/calendar" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <CalendarDays className="size-4" /> Calendar
          </Link>}
          {canViewBilling && <>
            <Link href="/billing" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#397f99] px-3 text-sm font-semibold text-white">
              <ReceiptText className="size-4" /> Billing
            </Link>
            <Link href="/billing/claims" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <FileClock className="size-4" /> Claims
            </Link>
          </>}
        </div>
      </div>

      <form className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-950">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          From
          <input type="date" name="from" defaultValue={from} max={to} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          To
          <input type="date" name="to" defaultValue={to} min={from} max={todayKey} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </label>
        <button type="submit" className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
          Update reports
        </button>
        <p className="text-xs text-slate-500 sm:ml-auto sm:max-w-sm sm:text-right">Date ranges use the practice time zone ({timeZone}). Current receivables show their age as of today.</p>
      </form>

      <section aria-label="Report summary" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Completed visits", value: completedVisits.toLocaleString("en-ZA"), detail: "Completed encounters in this period", icon: HeartPulse, accent: "sky" as const },
          { label: "Appointments", value: appointmentTotal.toLocaleString("en-ZA"), detail: "All appointment statuses in this period", icon: CalendarDays, accent: "violet" as const },
          { label: "Income collected", value: money.format(collectedAmount), detail: `${selectedPaymentTotals._count._all} payments recorded in this period`, icon: WalletCards, accent: "emerald" as const },
          { label: "Open claim balance", value: money.format(totalClaimBalance), detail: "Submitted claims awaiting settlement", icon: FileClock, accent: "amber" as const },
        ].map(({ label, value, detail, icon: Icon, accent }) => (
          <article key={label} className={`rounded-2xl border border-t-4 border-slate-200 ${reportAccents[accent].border} bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
              <span className={`flex size-9 items-center justify-center rounded-xl ${reportAccents[accent].icon}`}>
                <Icon className="size-5" />
              </span>
            </div>
            <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportSection icon={Activity} accent="sky" title="Practice activity" description={`${patientCount} patients and ${activeStaffCount} active staff currently in this practice.`}>
          <div className="grid gap-6 p-5 md:grid-cols-2 sm:p-6">
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Appointment status</h3>
              <div className="space-y-3">
                {appointmentStatuses.map((status) => {
                  const count = appointmentCounts.get(status) ?? 0;
                  const share = appointmentTotal ? Math.round((count / appointmentTotal) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className={`size-2 rounded-full ${appointmentStatusColors[status]}`} />{formatStatus(status)}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${appointmentStatusColors[status]}`} style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Completed visits by practitioner</h3>
              {practitionerVisitRows.length === 0 ? <EmptyState>No completed visits in this period.</EmptyState> : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {practitionerVisitRows.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{row.name}</span>
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 font-bold text-sky-800 dark:bg-sky-950/70 dark:text-sky-300">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ReportSection>

        <ReportSection icon={ChartNoAxesCombined} accent="emerald" title="Income and collections" description="Issued invoice value and payments received in the selected period.">
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoiced</p>
              <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{money.format(invoicedAmount)}</p>
              <p className="mt-1 text-xs text-slate-500">{selectedInvoiceTotals._count._all} issued, paid, or overdue invoices</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open invoice balance</p>
              <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{money.format(totalInvoiceBalance)}</p>
              <p className="mt-1 text-xs text-slate-500">Current issued and overdue invoices</p>
            </div>
            <div className="sm:col-span-2">
              <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Collected by payer</h3>
              {paymentsByPayer.length === 0 ? <EmptyState>No payments were recorded in this period.</EmptyState> : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {paymentsByPayer.map((row) => (
                    <div key={row.payerType} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm ${row.payerType === "MEDICAL_AID" ? "border-violet-100 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/30" : "border-sky-100 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/30"}`}>
                      <span className="text-slate-600 dark:text-slate-300">{row.payerType === "MEDICAL_AID" ? "Medical aid" : "Patient"}</span>
                      <span className="font-bold text-slate-950 dark:text-white">{money.format(row._sum.amount?.toNumber() ?? 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              <h3 className="mb-3 mt-5 text-sm font-bold text-slate-800 dark:text-slate-100">Collected by payment method</h3>
              {paymentsByMethod.length === 0 ? <EmptyState>No payment methods to report.</EmptyState> : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paymentsByMethod.sort((a, b) => (b._sum.amount?.toNumber() ?? 0) - (a._sum.amount?.toNumber() ?? 0)).map((row) => (
                    <div key={row.method} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{paymentMethodNames[row.method] ?? formatStatus(row.method)}</span>
                      <span className="font-semibold text-slate-950 dark:text-white">{money.format(row._sum.amount?.toNumber() ?? 0)} <span className="font-normal text-slate-500">· {row._count._all} payments</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Collections by month · last six months</h3>
              {collectionRows.every((row) => row.amount === 0) ? <EmptyState>No collections have been recorded in the last six months.</EmptyState> : (
                <div className="space-y-3">
                  {collectionRows.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{money.format(row.amount)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${maxMonthlyCollection ? (row.amount / maxMonthlyCollection) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ReportSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportSection icon={Clock3} accent="amber" title="Receivables aging" description="Open invoice balances grouped by days past due, or by invoice date when no due date is set.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800"><th className="px-5 py-3 font-semibold">Age</th><th className="px-3 py-3 text-right font-semibold">Invoices</th><th className="px-5 py-3 text-right font-semibold">Balance</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoiceAging.map((row, index) => <tr key={row.label}><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${agingLabelColors[index]}`}>{row.label}</span></td><td className="px-3 py-3.5 text-right text-slate-600 dark:text-slate-300">{row.count}</td><td className="px-5 py-3.5 text-right font-semibold text-slate-950 dark:text-white">{money.format(row.balance)}</td></tr>)}
                <tr className="bg-amber-50/70 font-bold dark:bg-amber-950/30"><td className="px-5 py-3.5">Total</td><td className="px-3 py-3.5 text-right">{invoiceAging.reduce((sum, row) => sum + row.count, 0)}</td><td className="px-5 py-3.5 text-right">{money.format(totalInvoiceBalance)}</td></tr>
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection icon={FileClock} accent="rose" title="Medical-aid claim aging" description="Submitted claims still awaiting payment. Age runs from the submission date, falling back to claim creation.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800"><th className="px-5 py-3 font-semibold">Age</th><th className="px-3 py-3 text-right font-semibold">Claims</th><th className="px-5 py-3 text-right font-semibold">Balance</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claimAging.map((row, index) => <tr key={row.label}><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${agingLabelColors[index]}`}>{row.label}</span></td><td className="px-3 py-3.5 text-right text-slate-600 dark:text-slate-300">{row.count}</td><td className="px-5 py-3.5 text-right font-semibold text-slate-950 dark:text-white">{money.format(row.balance)}</td></tr>)}
                <tr className="bg-rose-50/70 font-bold dark:bg-rose-950/30"><td className="px-5 py-3.5">Total</td><td className="px-3 py-3.5 text-right">{claimAging.reduce((sum, row) => sum + row.count, 0)}</td><td className="px-5 py-3.5 text-right">{money.format(totalClaimBalance)}</td></tr>
              </tbody>
            </table>
          </div>
        </ReportSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportSection icon={Stethoscope} accent="violet" title="ICD-10 frequency" description="Most common diagnosis codes on issued invoices in the selected period.">
          {icdRows.length === 0 ? <EmptyState>No ICD-10 codes were recorded on issued invoices in this period.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800"><th className="px-5 py-3 font-semibold">ICD-10 code</th><th className="px-3 py-3 text-right font-semibold">Occurrences</th><th className="px-3 py-3 text-right font-semibold">Units</th><th className="px-5 py-3 text-right font-semibold">Line value</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {icdRows.map((row) => <tr key={row.code}><td className="px-5 py-3.5"><span className="rounded-md bg-violet-50 px-2.5 py-1 font-mono font-semibold text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">{row.code}</span></td><td className="px-3 py-3.5 text-right">{row.frequency}</td><td className="px-3 py-3.5 text-right">{row.units}</td><td className="px-5 py-3.5 text-right font-semibold">{money.format(row.amount)}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>

        <ReportSection icon={CreditCard} accent="cyan" title="Service income" description="Highest-value tariff items on issued invoices in the selected period.">
          {serviceRows.length === 0 ? <EmptyState>No invoiced services were recorded in this period.</EmptyState> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800"><th className="px-5 py-3 font-semibold">Service</th><th className="px-3 py-3 text-right font-semibold">Units</th><th className="px-5 py-3 text-right font-semibold">Line value</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {serviceRows.map((row) => <tr key={`${row.code}-${row.description}`}><td className="px-5 py-3.5"><span className="rounded-md bg-cyan-50 px-2 py-1 font-mono text-xs font-semibold text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">{row.code}</span><span className="ml-2 font-medium text-slate-800 dark:text-slate-200">{row.description}</span></td><td className="px-3 py-3.5 text-right">{row.units}</td><td className="px-5 py-3.5 text-right font-semibold">{money.format(row.amount)}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>
      </div>

      <div className="mt-6">
        <ReportSection icon={ClipboardList} accent="sky" title="Claim activity" description="Claim volume and claimed value by current status, based on claim creation date in the selected period.">
          {claimsByStatus.length === 0 ? <EmptyState>No claims were created in this period.</EmptyState> : (
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-6">
              {claimsByStatus.sort((a, b) => b._count._all - a._count._all).map((row) => (
                <article key={row.status} className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                  <p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${claimStatusColors[row.status] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{formatStatus(row.status)}</span></p>
                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{row._count._all}</p>
                  <p className="mt-1 text-sm text-slate-500">{money.format(row._sum.amount?.toNumber() ?? 0)} claimed</p>
                </article>
              ))}
            </div>
          )}
        </ReportSection>
      </div>

      <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
        Visit and appointment reports use their scheduled or encounter start dates. Invoice and claim activity uses creation dates; collections use the date each payment was recorded.
      </p>
    </main>
  );
}
