import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export default async function StaffMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePermission("patient:read");
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  const patientConversations = await prisma.patient.findMany({
    where: {
      practiceId: session.practiceId,
      messages: { some: {} },
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
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderType: true },
      },
      _count: {
        select: {
          messages: { where: { senderType: "PATIENT", readAt: null } },
        },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-12 pt-28 sm:px-6">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#397f99]">Patient communication</p>
        <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white sm:text-4xl">Messages</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">View patient conversations and send secure replies.</p>
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <form className="border-b border-slate-200 p-3 dark:border-slate-800">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search patients</span>
            <input name="q" defaultValue={query} placeholder="Search patient conversations" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#397f99] dark:border-slate-700 dark:bg-slate-950" />
          </label>
        </form>

        {patientConversations.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <MessageSquare className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No patient conversations</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {patientConversations.map((patient) => {
              const latest = patient.messages[0];
              const hasUnreadMessages = patient._count.messages > 0;
              return (
                <Link key={patient.id} href={`/messages/${patient.id}`} className={`flex gap-4 px-5 py-4 transition hover:bg-[#397f99]/[0.035] dark:hover:bg-[#397f99]/10 ${hasUnreadMessages ? "bg-[#397f99]/[0.08] dark:bg-[#397f99]/[0.12]" : ""}`}>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#397f99]/10 font-bold text-[#397f99]">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className={hasUnreadMessages ? "font-bold text-[#397f99] dark:text-sky-300" : "font-semibold text-slate-950 dark:text-white"}>{patient.firstName} {patient.lastName}</p>
                      {latest && <p className="shrink-0 text-xs text-slate-400">{latest.createdAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={`truncate text-sm ${hasUnreadMessages ? "font-semibold text-slate-800 dark:text-slate-200" : "text-slate-500"}`}>
                        {latest?.senderType === "PRACTICE" ? "You: " : ""}{latest?.body ?? ""}
                      </p>
                      {hasUnreadMessages && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#397f99] text-[10px] font-bold text-white">{patient._count.messages > 99 ? "99+" : patient._count.messages}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
