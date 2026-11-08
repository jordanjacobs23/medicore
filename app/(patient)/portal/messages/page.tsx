import Link from "next/link";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendPatientMessage } from "./actions";

export default async function PatientMessagesPage() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") return null;

  const [messages] = await Promise.all([
    prisma.portalMessage.findMany({
      where: { practiceId: session.practiceId, patientId: session.userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.portalMessage.updateMany({
      where: {
        practiceId: session.practiceId,
        patientId: session.userId,
        senderType: "PRACTICE",
        readAt: null,
      },
      data: { readAt: new Date() },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-12 pt-10 sm:px-6">
      <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-semibold text-[#397f99] mt-15">
        <ArrowLeft className="size-4" />
        Back to portal
      </Link>
      <div className="mt-4">
        <h1 className="font-montserrat text-3xl font-bold text-slate-950 dark:text-white">Secure Messages</h1>
        <p className="mt-2 text-sm text-slate-500">Communicate privately with your care team.</p>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="min-h-72 max-h-[520px] overflow-y-auto p-5 sm:p-7">
          {messages.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center text-center">
              <MessageSquare className="size-9 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">Start a secure conversation</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">Send a message to your practice. Do not use this form for emergencies.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const fromPatient = message.senderType === "PATIENT";
                return (
                  <div key={message.id} className={`flex ${fromPatient ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${fromPatient ? "rounded-br-md bg-[#397f99] text-white" : "rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                      <p className={`mt-1 text-[10px] ${fromPatient ? "text-blue-100" : "text-slate-400"}`}>
                        {fromPatient ? "You" : "Practice"} · {message.createdAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <form action={sendPatientMessage} className="flex gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <label className="sr-only" htmlFor="message-body">Message</label>
          <textarea id="message-body" required name="body" rows={2} maxLength={4000} placeholder="Write a secure message…" className="min-h-11 flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#397f99] focus:ring-2 focus:ring-[#397f99]/15 dark:border-slate-700 dark:bg-slate-950" />
          <button type="submit" className="inline-flex h-11 items-center gap-2 self-end rounded-lg bg-[#397f99] px-4 text-sm font-semibold text-white">
            <Send className="size-4" />
            Send
          </button>
        </form>
      </section>
    </main>
  );
}
