"use client";

export function StatusFilter({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      name="status"
      defaultValue={defaultValue}
      aria-label="Invoice status"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
    >
      <option value="">All statuses</option>
      <option value="DRAFT">Draft</option>
      <option value="ISSUED">Issued</option>
      <option value="PAID">Paid</option>
      <option value="OVERDUE">Overdue</option>
      <option value="VOID">Void</option>
    </select>
  );
}
