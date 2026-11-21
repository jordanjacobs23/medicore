import { PaymentPayerType, Prisma } from "@prisma/client";
import { getSessionContext } from "@/lib/auth/session";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { createTextPdf } from "@/lib/pdf/text-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return new Response("Sign in as a patient to access payment records.", { status: 401 });
  }
  const yearValue = new URL(request.url).searchParams.get("year") ?? "";
  const year = Number(yearValue);
  const currentYear = new Date().getUTCFullYear();
  if (!/^\d{4}$/.test(yearValue) || year < 2000 || year > currentYear) {
    return new Response("Choose a valid calendar year.", { status: 400 });
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const [patient, practice, payments] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: session.userId, practiceId: session.practiceId },
      select: { firstName: true, lastName: true },
    }),
    prisma.practice.findUnique({
      where: { id: session.practiceId },
      select: { name: true, timeZone: true },
    }),
    prisma.payment.findMany({
      where: {
        patientId: session.userId,
        practiceId: session.practiceId,
        payerType: PaymentPayerType.PATIENT,
        recordedAt: { gte: start, lt: end },
      },
      orderBy: { recordedAt: "asc" },
      select: { amount: true, method: true, reference: true, recordedAt: true },
    }),
  ]);
  if (!patient || !practice) return new Response("Patient account not found.", { status: 404 });

  const total = payments.reduce(
    (sum, payment) => sum.add(payment.amount),
    new Prisma.Decimal(0),
  );
  await logSensitiveRecordAccess(session, {
    resourceType: "PATIENT_PAYMENT_STATEMENT",
    resourceId: session.userId,
    metadata: { year, paymentCount: payments.length, format: "PDF" },
  });

  const paymentLines = payments.map((payment) => {
    const date = payment.recordedAt.toLocaleDateString("en-ZA", { timeZone: practice.timeZone });
    const reference = payment.reference ? `; reference ${payment.reference}` : "";
    return `${date} | R${payment.amount.toFixed(2)} | ${payment.method.replaceAll("_", " ")}${reference}`;
  });
  const pdf = createTextPdf([
    practice.name,
    "ANNUAL PATIENT PAYMENT STATEMENT",
    `Statement year: ${year}`,
    `Patient: ${patient.firstName} ${patient.lastName}`,
    "",
    "Patient payments recorded during this calendar year:",
    ...(paymentLines.length ? paymentLines : ["No patient payments were recorded for this year."]),
    "",
    `Total patient payments: R${total.toFixed(2)}`,
    "",
    "This statement lists payments recorded by the practice for your own records.",
    "It is not a SARS tax certificate or a medical-scheme tax certificate.",
    "Please contact your medical scheme for an official scheme tax certificate.",
    `Generated: ${new Date().toLocaleString("en-ZA", { timeZone: practice.timeZone })}`,
  ]);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="payment-statement-${year}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
