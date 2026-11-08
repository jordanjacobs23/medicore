import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function PatientDocumentsPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;

  const documents = await prisma.patientDocument.findMany({
    where: { practiceId: session.practiceId, patientId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-[#397f99] mt-15">
        <ArrowLeft className="size-4" />
        Back to portal
      </Link>
      <div className="mt-4">
        <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Documents</h1>
        <p className="mt-2 text-sm text-slate-500">Access documents shared by your practice.</p>
      </div>

      {documents.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-5 py-14 text-center dark:border-slate-700">
          <FileText className="mx-auto size-9 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No documents shared yet</p>
        </div>
      ) : (
        <section className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
          {documents.map((document) => (
            <article key={document.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-950 dark:text-white">{document.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {document.createdAt.toLocaleDateString()} · {(document.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-[#397f99] dark:border-slate-700" aria-label={`Download ${document.name}`}>
                <Download className="size-4" />
              </a>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
