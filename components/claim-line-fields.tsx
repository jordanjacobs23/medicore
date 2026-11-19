"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export type ClaimLineInput = {
  id?: string;
  tariffCode: string;
  icd10Code: string;
  description: string;
  quantity: number;
  unitPrice: string;
  modifierCodes: string;
};

const blankLine = (description = ""): ClaimLineInput => ({
  tariffCode: "",
  icd10Code: "",
  description,
  quantity: 1,
  unitPrice: "",
  modifierCodes: "",
});

export function ClaimLineFields({
  initialLines,
  defaultDescription = "",
  readOnly = false,
}: {
  initialLines?: ClaimLineInput[];
  defaultDescription?: string;
  readOnly?: boolean;
}) {
  const [lines, setLines] = useState<ClaimLineInput[]>(
    initialLines?.length ? initialLines : [blankLine(defaultDescription)],
  );

  return (
    <div className="space-y-4 sm:col-span-2">
      {lines.map((line, index) => (
        <fieldset key={`${line.id ?? "new"}-${index}`} className="grid gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2">
          <legend className="px-1 text-sm font-bold">Billing line {index + 1}</legend>
          <input type="hidden" name="invoiceLineId" value={line.id ?? ""} />
          <label className="block space-y-2 text-sm font-semibold">
            ICD-10-ZA diagnosis code
            <input name="icd10Code" defaultValue={line.icd10Code} readOnly={readOnly} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            NHRPL / scheme tariff code
            <input required name="tariffCode" defaultValue={line.tariffCode} readOnly={readOnly} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
          </label>
          <label className="block space-y-2 text-sm font-semibold sm:col-span-2">
            Description
            <input required name="description" defaultValue={line.description} readOnly={readOnly} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            Quantity
            <input required type="number" name="quantity" min="1" max="999" step="1" defaultValue={line.quantity} readOnly={readOnly} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            Unit price (R)
            <input required type="number" name="unitPrice" min="0.01" step="0.01" defaultValue={line.unitPrice} readOnly={readOnly} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            Modifier codes, comma separated
            <input name="modifierCodes" defaultValue={line.modifierCodes} readOnly={readOnly} className="h-11 w-full rounded-lg border px-3 read-only:bg-slate-50 dark:bg-slate-950 dark:read-only:bg-slate-900" />
          </label>
        </fieldset>
      ))}
      {!readOnly && (
        <button
          type="button"
          onClick={() => setLines((current) => [...current, blankLine()])}
          className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold text-[#397f99]"
        >
          <Plus className="size-4" />Add billing line
        </button>
      )}
    </div>
  );
}
