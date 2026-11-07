import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { removeStaff } from "../../actions";

export default async function RemoveStaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("staff:*");
  const { id } = await params;
  const staff = await prisma.staff.findFirst({
    where: { id, practiceId: session.practiceId, isActive: true },
  });

  if (!staff || staff.id === session.userId) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/practice/staff" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to staff directory
      </Link>
      <section className="mt-5 overflow-hidden rounded-xl border border-red-200 bg-white dark:border-red-950 dark:bg-slate-950">
        <div className="p-5 sm:p-7">
          <div className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50"><UserX className="size-5" /></div>
          <h1 className="mt-5 font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Remove staff member?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            <strong className="text-slate-800 dark:text-slate-200">{staff.firstName} {staff.lastName}</strong> will lose access to {staff.email} and their membership will be removed from this practice. Existing clinical and billing records remain unchanged.
          </p>
          <form action={removeStaff.bind(null, staff.id)} className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link href="/practice/staff" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</Link>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">Remove staff member</button>
          </form>
        </div>
      </section>
    </main>
  );
}
