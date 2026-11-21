import { getSessionContext } from "@/lib/auth/session";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { createTextPdf } from "@/lib/pdf/text-pdf";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return new Response("Sign in as a patient to access this prescription.", { status: 401 });
  }
  const { id } = await context.params;
  const prescription = await prisma.prescription.findFirst({
    where: {
      id,
      patientId: session.userId,
      encounter: { practiceId: session.practiceId },
    },
    select: {
      id: true,
      medication: true,
      dosage: true,
      route: true,
      frequency: true,
      duration: true,
      quantity: true,
      refills: true,
      instructions: true,
      status: true,
      createdAt: true,
      patient: { select: { firstName: true, lastName: true } },
      practitioner: { select: { firstName: true, lastName: true } },
      encounter: { select: { practice: { select: { name: true } } } },
    },
  });
  if (!prescription) return new Response("Prescription not found.", { status: 404 });

  await logSensitiveRecordAccess(session, {
    resourceType: "PRESCRIPTION",
    resourceId: prescription.id,
    metadata: { format: "PDF", source: "PATIENT_PORTAL" },
  });

  const pdf = createTextPdf([
    prescription.encounter.practice.name,
    "PRESCRIPTION RECORD",
    "",
    `Patient: ${prescription.patient.firstName} ${prescription.patient.lastName}`,
    `Medication: ${prescription.medication}`,
    `Dosage: ${prescription.dosage}`,
    `Route: ${prescription.route ?? "Not recorded"}`,
    `Frequency: ${prescription.frequency ?? "Not recorded"}`,
    `Duration: ${prescription.duration ?? "Not recorded"}`,
    `Quantity: ${prescription.quantity ?? "Not recorded"}`,
    `Refills: ${prescription.refills}`,
    `Instructions: ${prescription.instructions ?? "None recorded"}`,
    `Status: ${prescription.status}`,
    `Prescribed by: ${prescription.practitioner.firstName} ${prescription.practitioner.lastName}`,
    `Date: ${prescription.createdAt.toLocaleDateString("en-ZA")}`,
    "",
    "Electronic record only. This document is not signed and was not sent to a pharmacy.",
  ]);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prescription-${prescription.id.slice(-8)}.pdf"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
