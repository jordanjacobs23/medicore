"use client";

export function ClaimStatusFilter({ defaultValue }: { defaultValue: string }) {
  return (
    <select
      name="status"
      defaultValue={defaultValue}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="h-9 rounded-lg border px-2 text-xs dark:bg-slate-950"
    >
      {["DRAFT", "SUBMITTED", "PENDING", "APPROVED", "DENIED", "PAID", "CLOSED"].map(
        (status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ),
      )}
    </select>
  );
}
