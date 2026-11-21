import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, FileCheck2 } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { submitCorrectionRequest } from "../privacy-actions";

const fieldClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950";

export default async function PatientPrivacyPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;
  const [{ request: requestStatus }, requests] = await Promise.all([
    searchParams,
    prisma.patientCorrectionRequest.findMany({
      where: { practiceId: session.practiceId, patientId: session.userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal" className="mt-15 inline-flex items-center gap-2 text-sm font-semibold text-[#397f99]"><ArrowLeft className="size-4" />Back to portal</Link>
      <div className="mt-4"><h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Privacy and records</h1><p className="mt-2 text-sm text-slate-500">Request a correction or download a copy of the personal information held in your patient account.</p></div>

      {requestStatus ? <p role="status" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">Your correction request has been sent to your practice.</p> : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start gap-3"><ArrowDownToLine className="mt-0.5 size-5 text-[#397f99]" /><div><h2 className="font-bold text-slate-950 dark:text-white">POPIA records export</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Download a JSON copy of your profile, appointments, clinical records, prescriptions, billing records, documents, secure messages, privacy notices, and correction requests. This export includes lab results that have not been released to the portal.</p><a href="/api/portal/records/export" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-bold text-white"><ArrowDownToLine className="size-4" />Download my records</a></div></div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start gap-3"><FileCheck2 className="mt-0.5 size-5 text-[#397f99]" /><div><h2 className="font-bold text-slate-950 dark:text-white">Request a correction</h2><p className="mt-1 text-sm text-slate-500">Tell your practice which information is incorrect and what you believe it should say. The practice will review the request and update its status here.</p></div></div>
        <form action={submitCorrectionRequest} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Records or fields to correct<input className={fieldClass} name="requestedFields" maxLength={250} required placeholder="For example: contact phone, date of birth, or medication history" /></label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">What should be corrected?<textarea className={`${fieldClass} min-h-32 resize-y`} name="requestedChanges" maxLength={3500} required placeholder="Describe the current information and the correction you are requesting." /></label>
          <button type="submit" className="inline-flex h-10 items-center justify-center rounded-lg bg-[#397f99] px-4 text-sm font-bold text-white">Send correction request</button>
        </form>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <h2 className="font-bold text-slate-950 dark:text-white">Your correction requests</h2>
        {requests.length === 0 ? <p className="mt-3 text-sm text-slate-500">No correction requests yet.</p> : <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{requests.map((item) => <li key={item.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800 dark:text-slate-200">{item.requestedFields}</p><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.status.replaceAll("_", " ")}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{item.requestedChanges}</p><p className="mt-2 text-xs text-slate-400">Sent {item.createdAt.toLocaleDateString("en-ZA")}{item.reviewedAt ? ` · Reviewed ${item.reviewedAt.toLocaleDateString("en-ZA")}` : ""}</p>{item.reviewNote ? <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">Practice response: {item.reviewNote}</p> : null}</li>)}</ul>}
      </section>
    </main>
  );
}
