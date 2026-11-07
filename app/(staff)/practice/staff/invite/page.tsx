import Link from "next/link";
import { ArrowLeft, MailPlus } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { inviteStaff } from "../actions";

const roles = [
  ["PRACTICE_MANAGER", "Practice manager"],
  ["PRACTITIONER", "Practitioner"],
  ["RECEPTIONIST", "Receptionist"],
  ["BILLING_CLERK", "Billing clerk"],
  ["NURSE", "Nurse"],
  ["ASSISTANT", "Assistant"],
  ["VIEWER", "Viewer"],
] as const;

export default async function InviteStaffPage() {
  await requirePermission("staff:*");

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/practice/staff" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to staff directory
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#397f99]/10 text-[#397f99]"><MailPlus className="size-5" /></div>
            <div>
              <h1 className="font-montserrat text-2xl font-bold text-slate-950 dark:text-white">Invite staff member</h1>
              <p className="mt-1 text-sm text-slate-500">Send an invitation to join this practice.</p>
            </div>
          </div>
        </div>

        <form action={inviteStaff} className="space-y-5 p-5 sm:p-7">
          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email address
            <input required type="email" name="emailAddress" autoComplete="email" placeholder="staff@example.com" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950" />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Practice role
            <select required name="role" defaultValue="" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none transition focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950">
              <option value="" disabled>Select a role</option>
              {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-950 dark:bg-blue-950/40 dark:text-blue-300">
            The role controls which modules and actions this staff member can access.
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Link href="/practice/staff" className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</Link>
            <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white hover:bg-[#2f718a]">Send invitation</button>
          </div>
        </form>
      </section>
    </main>
  );
}
