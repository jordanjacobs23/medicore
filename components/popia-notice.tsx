"use client";

import { useState } from "react";
import { acceptPopiaNotice } from "@/app/(patient)/portal/privacy-actions";

export function PopiaNotice({
  open,
  noticeVersion,
}: {
  open: boolean;
  noticeVersion: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function accept() {
    setSubmitting(true);
    setError("");
    try {
      await acceptPopiaNotice(noticeVersion);
    } catch {
      setError("We could not record your acknowledgement. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="popia-notice-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-950 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397f99]">POPIA privacy notice</p>
        <h1 id="popia-notice-title" className="mt-2 font-montserrat text-2xl font-bold text-slate-950 dark:text-white">
          How we process your health information
        </h1>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <p>MediCore processes personal and health information to provide care, appointments, billing, communication, and patient portal services.</p>
          <p>Access is limited to authorised staff with a role or care relationship that permits it. Access and changes are recorded for security, audit, and compliance.</p>
          <p>We retain information only for the period required for care, legal, billing, and professional obligations. You may request access, correction, restriction, or deletion through your practice, subject to applicable law.</p>
          <p>You may withdraw consent where processing is based on consent, without affecting processing that is required by law or necessary for your care and billing.</p>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
        <button type="button" disabled={submitting} onClick={accept} className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#397f99] px-4 text-sm font-bold text-white disabled:opacity-60">
          {submitting ? "Recording acknowledgement..." : "I acknowledge this privacy notice"}
        </button>
      </section>
    </div>
  );
}
