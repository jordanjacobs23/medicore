import Link from "next/link";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { updatePracticeSettings } from "./actions";

export default async function PracticeSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requirePermission("staff:*");
  const params = await searchParams;
  const practice = await prisma.practice.findUnique({
    where: { id: session.practiceId },
    select: { name: true, clerkOrgId: true },
  });

  if (!practice) {
    throw new Error("Practice not found.");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/practice/staff" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to Practice
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Practice Settings</h1>
              <p className="mt-1 text-sm text-slate-500">Manage the details for this practice.</p>
            </div>
          </div>
        </div>

        {params.saved && (
          <div className="mx-5 mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 sm:mx-7">
            Practice settings saved successfully.
          </div>
        )}

        <form action={updatePracticeSettings} className="space-y-5 p-5 sm:p-7">
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Practice name
            <input required maxLength={100} name="name" defaultValue={practice.name} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950" />
          </label>

          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Organization ID</span>
            <code className="break-all text-xs text-slate-500">{practice.clerkOrgId}</code>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link href="/practice/staff" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</Link>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">
              <Save className="size-4" />
              Save Changes
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
