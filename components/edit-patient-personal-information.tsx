"use client";

import { useActionState, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import {
  updatePatientPersonalInformation,
  type PatientUpdateState,
} from "@/app/(staff)/patients/actions";

type Props = {
  patientId: string;
  firstName: string;
  lastName: string;
  email: string;
};

export function EditPatientPersonalInformation({
  patientId,
  firstName,
  lastName,
  email,
}: Props) {
  const [editing, setEditing] = useState(false);
  const updatePatient = updatePatientPersonalInformation.bind(null, patientId);
  const initialState: PatientUpdateState = {
    success: null,
    error: null,
  };
  const [state, formAction, pending] = useActionState(updatePatient, initialState);

  return (
    <article className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Patient information
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-[#397f99] transition hover:bg-[#397f99]/10"
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form action={formAction} className="space-y-4 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-slate-500">
              First name
              <input
                name="firstName"
                required
                defaultValue={firstName}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-500">
              Last name
              <input
                name="lastName"
                required
                defaultValue={lastName}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500">
            Email address
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-800 outline-none focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          {state.error && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {state.error}
            </p>
          )}
          {state.success && (
            <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <Check className="size-3.5" />
              {state.success}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <X className="size-3.5" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center rounded-lg bg-[#397f99] px-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 space-y-4 px-5 pb-5 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Email address</dt>
            <dd className="mt-1 break-all font-medium text-slate-700 dark:text-slate-200">
              {email}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Patient reference</dt>
            <dd className="mt-1 font-mono text-xs font-medium text-[#397f99]">
              {patientId}
            </dd>
          </div>
        </dl>
      )}
    </article>
  );
}
