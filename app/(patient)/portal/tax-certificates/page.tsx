import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, FileBadge2, ReceiptText } from "lucide-react";
import { PaymentPayerType } from "@prisma/client";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function PatientTaxCertificatesPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;
  const [documents, payments] = await Promise.all([
    prisma.patientDocument.findMany({
      where: {
        practiceId: session.practiceId,
        patientId: session.userId,
        OR: [
          { name: { contains: "tax", mode: "insensitive" } },
          { name: { contains: "certificate", mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { practiceId: session.practiceId, patientId: session.userId, payerType: PaymentPayerType.PATIENT },
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true },
    }),
  ]);
  const currentYear = new Date().getUTCFullYear();
  const years = [...new Set([currentYear, ...payments.map((payment) => payment.recordedAt.getUTCFullYear())])].sort((a, b) => b - a);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal" className="mt-15 inline-flex items-center gap-2 text-sm font-semibold text-[#397f99]"><ArrowLeft className="size-4" />Back to portal</Link>
      <div className="mt-4"><h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Tax certificates</h1><p className="mt-2 text-sm text-slate-500">Download payment records and certificates shared by your practice.</p></div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start gap-3"><ReceiptText className="mt-0.5 size-5 text-[#397f99]" /><div><h2 className="font-bold text-slate-950 dark:text-white">Annual payment statements</h2><p className="mt-1 text-sm leading-6 text-slate-500">Download a PDF summary of patient payments recorded by this practice for the selected calendar year.</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2">{years.map((year) => <a key={year} href={`/api/portal/tax-certificates?year=${year}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#397f99] hover:border-[#397f99] dark:border-slate-700"><ArrowDownToLine className="size-4" />{year} PDF</a>)}</div>
        <p className="mt-4 text-xs leading-5 text-slate-400">These are payment statements for your records. They are not SARS or medical-scheme tax certificates. Contact your medical scheme for its official certificate.</p>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-center gap-3"><FileBadge2 className="size-5 text-[#397f99]" /><h2 className="font-bold text-slate-950 dark:text-white">Certificates shared by your practice</h2></div>
        {documents.length === 0 ? <p className="mt-3 text-sm text-slate-500">No tax certificates have been shared with you yet.</p> : <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{documents.map((document) => <li key={document.id} className="flex items-center gap-4 py-4"><div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-800 dark:text-slate-200">{document.name}</p><p className="mt-1 text-xs text-slate-500">Shared {document.createdAt.toLocaleDateString("en-ZA")} · {(document.size / 1024).toFixed(0)} KB</p></div><a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#397f99] dark:border-slate-700"><ArrowDownToLine className="size-4" />Download</a></li>)}</ul>}
      </section>
    </main>
  );
}
