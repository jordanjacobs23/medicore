import { ShieldAlert } from "lucide-react";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { requestBreakGlass, reviewBreakGlass } from "./actions";

export default async function BreakGlassPage({
  searchParams,
}: {
  searchParams: Promise<{ requested?: string; reviewed?: string }>;
}) {
  const session = await requirePermission("patient:read");
  const params = await searchParams;
  const [patients, requests] = await Promise.all([
    prisma.patient.findMany({
      where: { practiceId: session.practiceId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.breakGlassRequest.findMany({
      where: {
        practiceId: session.practiceId,
        OR: [
          { requesterStaffId: session.userId },
          ...(session.role === "PRACTICE_MANAGER" ? [{ status: "PENDING" as const }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { patient: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-12 pt-28 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40">
          <ShieldAlert className="size-5" />
        </div>
        <div>
          <h1 className="font-montserrat text-2xl font-bold">Break-glass Access</h1>
          <p className="mt-1 text-sm text-slate-500">Emergency access outside normal patient assignments.</p>
        </div>
      </div>

      {(params.requested || params.reviewed) ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {params.requested ? "Emergency access requested." : "Break-glass request reviewed."}
        </div>
      ) : null}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 sm:p-7">
        <h2 className="font-bold">Request Emergency Access</h2>
        <p className="mt-1 text-sm text-slate-500">Approval grants access for 60 minutes and is permanently audited.</p>
        <form action={requestBreakGlass} className="mt-5 grid gap-4">
          <label className="text-sm font-semibold">Patient
            <select required name="patientId" className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950">
              <option value="">Select a patient</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">Clinical Justification
            <textarea required minLength={20} maxLength={1000} name="reason" rows={4} className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
          </label>
          <button className="h-11 justify-self-end rounded-lg bg-red-600 px-4 text-sm font-bold text-white">Submit Emergency Request</button>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <h2 className="border-b border-slate-200 px-5 py-4 font-bold dark:border-slate-800">Requests</h2>
        {requests.map((request) => (
          <article key={request.id} className="border-b border-slate-100 px-5 py-4 text-sm last:border-0 dark:border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{request.patient.firstName} {request.patient.lastName}</p>
                <p className="mt-1 text-slate-500">{request.reason}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold dark:bg-slate-800">{request.status}</span>
            </div>
            {session.role === "PRACTICE_MANAGER" && request.status === "PENDING" ? (
              <form action={reviewBreakGlass} className="mt-3 flex justify-end gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <button name="decision" value="DENIED" className="h-9 rounded-lg border px-3 font-semibold">Deny</button>
                <button name="decision" value="APPROVED" className="h-9 rounded-lg bg-[#397f99] px-3 font-semibold text-white">Approve 60 minutes</button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
