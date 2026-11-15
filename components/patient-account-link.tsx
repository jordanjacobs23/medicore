"use client";

import { useActionState } from "react";
import { Link2, MailPlus } from "lucide-react";
import {
  connectPatientAccount,
  type PatientAccountLinkState,
} from "@/app/(staff)/patients/actions";

type Props = {
  patientId: string;
  linked: boolean;
  invitationPending: boolean;
};

const initialState: PatientAccountLinkState = {
  success: null,
  error: null,
};

export function PatientAccountLink({
  patientId,
  linked,
  invitationPending,
}: Props) {
  const action = connectPatientAccount.bind(null, patientId);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (linked) return null;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-[#397f99]" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Patient portal account
        </h2>
      </div>

      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {invitationPending
          ? "An invitation is pending. Resend it if the patient needs a new email."
          : "Connect an existing account by verified email or invite the patient to create one."}
      </p>
      <form action={formAction} className="mt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#397f99] px-3 text-xs font-semibold text-white transition hover:bg-[#2f718a] disabled:cursor-wait disabled:opacity-60"
        >
          <MailPlus className="size-3.5" />
          {pending
            ? "Connecting..."
            : invitationPending
              ? "Resend invitation"
              : "Connect account"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {state.success}
        </p>
      ) : null}
    </article>
  );
}
