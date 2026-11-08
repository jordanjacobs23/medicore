import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { sendStaffMessage } from "../actions";

export default async function StaffPatientMessagesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const session = await requirePermission("patient:read");
  const { patientId } = await params;
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) notFound();

  const [messages] = await Promise.all([
    prisma.portalMessage.findMany({
      where: {
        practiceId: session.practiceId,
        patientId: patient.id,
      },
      include: {
        senderStaff: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.portalMessage.updateMany({
      where: {
        practiceId: session.practiceId,
        patientId: patient.id,
        senderType: "PATIENT",
        readAt: null,
      },
      data: { readAt: new Date() },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-12 pt-28 sm:px-6">
      <Link href="/messages" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#397f99]">
        <ArrowLeft className="size-4" />
        Back to messages
      </Link>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h1 className="font-montserrat text-xl font-bold text-slate-950 dark:text-white">
            {patient.firstName} {patient.lastName}
          </h1>
          <Link href={`/patients/${patient.id}`} className="mt-1 inline-block text-sm font-semibold text-[#397f99]">View patient record</Link>
        </div>

        <div className="min-h-72 max-h-[520px] overflow-y-auto p-5 sm:p-7">
          {messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No messages in this conversation.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const fromPatient = message.senderType === "PATIENT";
                return (
                  <div key={message.id} className={`flex ${fromPatient ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${fromPatient ? "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100" : "rounded-br-md bg-[#397f99] text-white"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                      <p className={`mt-1 text-[10px] ${fromPatient ? "text-slate-400" : "text-blue-100"}`}>
                        {fromPatient ? `${patient.firstName} ${patient.lastName}` : message.senderStaff ? `${message.senderStaff.firstName} ${message.senderStaff.lastName}` : "Practice"} · {message.createdAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <form action={sendStaffMessage} className="flex gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <input type="hidden" name="patientId" value={patient.id} />
          <label htmlFor="staff-message-body" className="sr-only">Message</label>
          <textarea id="staff-message-body" required name="body" rows={2} maxLength={4000} placeholder="Write a secure reply…" className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950" />
          <button type="submit" className="inline-flex h-11 items-center gap-2 self-end rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">
            <Send className="size-4" />
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
