"use client";

import { ShieldCheck, UserX } from "lucide-react";
import { useRef, useState } from "react";

export function StaffStatusToggle({
  action,
  isActive,
  memberName,
}: {
  action: (formData: FormData) => void;
  isActive: boolean;
  memberName: string;
}) {
  const [pending, setPending] = useState(false);
  const confirmed = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isActive && !confirmed.current) {
      event.preventDefault();
      setPending(true);
    }
  }

  function confirmDeactivation(form: HTMLFormElement) {
    confirmed.current = true;
    setPending(false);
    form.requestSubmit();
  }

  function cancelDeactivation() {
    confirmed.current = false;
    setPending(false);
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit}>
      {pending && isActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4" role="presentation">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950" role="dialog" aria-modal="true" aria-labelledby="deactivate-title">
            <h2 id="deactivate-title" className="text-lg font-bold text-slate-950 dark:text-white">Deactivate staff member?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {memberName} will lose access to this practice until they are activated again.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={cancelDeactivation} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
              <button type="button" onClick={() => formRef.current && confirmDeactivation(formRef.current)} className="h-10 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700">Deactivate</button>
            </div>
          </div>
        </div>
      )}
      <button
        type="submit"
        title={isActive ? `Click to deactivate ${memberName}` : `Click to activate ${memberName}`}
        aria-label={isActive ? `Deactivate ${memberName}` : `Activate ${memberName}`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition hover:ring-2 hover:ring-offset-1 ${isActive ? "bg-emerald-50 text-emerald-700 hover:ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:ring-emerald-800" : "bg-slate-100 text-slate-600 hover:ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:ring-slate-700"}`}
      >
        {isActive ? <ShieldCheck className="size-3.5" /> : <UserX className="size-3.5" />}
        {isActive ? "Active" : "Inactive"}
      </button>
    </form>
  );
}
