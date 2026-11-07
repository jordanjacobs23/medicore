import Link from "next/link";
import { Mail, Search, ShieldCheck, Trash2, UserPlus, Users, UserX } from "lucide-react";
import { clerkClient } from "@clerk/nextjs/server";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { assignStaffRole, revokeStaffInvitation } from "./actions";
import { StaffRoleSelect } from "./role-select";

const roleLabels = {
  PRACTICE_MANAGER: "Practice Manager",
  PRACTITIONER: "Practitioner",
  RECEPTIONIST: "Receptionist",
  BILLING_CLERK: "Billing Clerk",
  NURSE: "Nurse",
  ASSISTANT: "Assistant",
  VIEWER: "Viewer",
} as const;

export default async function StaffDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; invited?: string; removed?: string; roleUpdated?: string }>;
}) {
  const session = await requirePermission("staff:*");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  const [staff, practice] = await Promise.all([
    prisma.staff.findMany({
      where: {
        practiceId: session.practiceId,
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: "insensitive" as const } },
                { lastName: { contains: query, mode: "insensitive" as const } },
                { email: { contains: query, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.practice.findUnique({
      where: { id: session.practiceId },
      select: { name: true, clerkOrgId: true },
    }),
  ]);

  if (!practice) {
    throw new Error("Practice not found.");
  }

  const clerk = await clerkClient();
  const invitations = await clerk.organizations.getOrganizationInvitationList({
    organizationId: practice.clerkOrgId,
    status: ["pending"],
  });
  const activeCount = staff.filter((member) => member.isActive).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1500px] px-4 pb-12 pt-28 sm:px-6 lg:px-8">
      {(params.invited || params.removed || params.roleUpdated) && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {params.invited
            ? "Invitation sent successfully."
            : params.removed
              ? "Staff member removed from the practice."
              : "Staff role updated successfully."}
        </div>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Practice Management</p>
          <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Staff directory</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{practice.name}</p>
        </div>
        <Link href="/practice/staff/invite" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(57,127,153,0.22)]">
          <UserPlus className="size-4" />
          Invite Staff
        </Link>
      </div>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Active staff</p><Users className="size-4 text-[#397f99]" /></div>
          <p className="mt-3 text-2xl font-bold">{activeCount}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Pending invitations</p><Mail className="size-4 text-[#397f99]" /></div>
          <p className="mt-3 text-2xl font-bold">{invitations.data.length}</p>
        </article>
      </section>

      {invitations.data.length > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-950 dark:text-white">Pending invitations</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {invitations.data.map((invitation) => (
              <div key={invitation.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{invitation.emailAddress}</p>
                  <p className="mt-1 text-xs text-slate-500">{invitation.roleName}</p>
                </div>
                <form action={revokeStaffInvitation.bind(null, invitation.id)}>
                  <button className="text-sm font-semibold text-red-600 hover:text-red-700">Revoke invitation</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950">
        <form className="flex gap-3 border-b border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <label className="relative flex-1">
            <span className="sr-only">Search staff</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input type="search" name="q" defaultValue={query} placeholder="Search by name or email" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#397f99] dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <button className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Search</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:border-slate-800">
                <th className="px-5 py-3.5">Staff member</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-7 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staff.map((member) => {
                const initials = `${member.firstName[0] ?? ""}${member.lastName[0] ?? ""}`.toUpperCase();
                return (
                  <tr key={member.id} className="text-sm">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-[#dcecf3] text-xs font-bold text-[#397f99]">{initials}</div>
                        <div><p className="font-semibold text-slate-950 dark:text-white">{member.firstName || member.lastName ? `${member.firstName} ${member.lastName}`.trim() : "Staff member"}</p><p className="mt-0.5 text-xs text-slate-500">{member.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {member.isActive ? (
                        <StaffRoleSelect
                          action={assignStaffRole.bind(null, member.id)}
                          currentRole={member.role}
                          memberName={`${member.firstName} ${member.lastName}`.trim()}
                          roles={Object.entries(roleLabels)}
                        />
                      ) : (
                        <span className="text-slate-500">{roleLabels[member.role]}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${member.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {member.isActive ? <ShieldCheck className="size-3.5" /> : <UserX className="size-3.5" />}
                        {member.isActive ? "Active" : "Removed"}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {member.isActive && member.id !== session.userId && (
                        <Link
                          href={`/practice/staff/${member.id}/remove`}
                          aria-label={`Remove ${member.firstName} ${member.lastName}`}
                          title="Remove staff member"
                          className="inline-flex size-8 items-center justify-center rounded-md text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
                        >
                          <Trash2 className="size-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
