import Link from "next/link";
import { ArrowLeft, Microscope } from "lucide-react";
import { LabResultStatus } from "@prisma/client";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const releasedStatuses = [LabResultStatus.FINAL, LabResultStatus.AMENDED, LabResultStatus.CORRECTED];

export default async function PatientResultsPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;
  const results = await prisma.labResult.findMany({
    where: {
      patientId: session.userId,
      releasedAt: { not: null },
      status: { in: releasedStatuses },
    },
    orderBy: { releasedAt: "desc" },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal" className="mt-15 inline-flex items-center gap-2 text-sm font-semibold text-[#397f99]"><ArrowLeft className="size-4" />Back to portal</Link>
      <div className="mt-4"><h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Released lab results</h1><p className="mt-2 text-sm text-slate-500">Results appear here after your practice releases them to the portal.</p></div>
      {results.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-5 py-14 text-center dark:border-slate-700"><Microscope className="mx-auto size-9 text-slate-300" /><p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No results have been released yet</p><p className="mt-1 text-sm text-slate-500">Contact your practice if you have questions about a test.</p></div> : <section className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">{results.map((result) => <article key={result.id} className="px-5 py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950 dark:text-white">{result.testName}</h2><p className="mt-1 text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">{result.resultValue}{result.unit ? ` ${result.unit}` : ""}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{result.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-xs text-slate-500">Resulted {result.resultAt.toLocaleDateString("en-ZA")}{result.referenceRange ? ` · Reference range ${result.referenceRange}` : ""}{result.releasedAt ? ` · Released ${result.releasedAt.toLocaleDateString("en-ZA")}` : ""}</p>{result.interpretation ? <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{result.interpretation}</p> : null}</article>)}</section>}
      <p className="mt-5 text-xs text-slate-400">Your practice can help explain what a result means in the context of your care.</p>
    </main>
  );
}
