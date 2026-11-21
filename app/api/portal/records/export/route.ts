import { getSessionContext } from "@/lib/auth/session";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionContext();
  if (!session || session.userType !== "PATIENT") {
    return new Response("Sign in as a patient to export your records.", { status: 401 });
  }

  const scope = { patientId: session.userId };
  const practiceScope = { ...scope, practiceId: session.practiceId };
  const [patient, appointments, encounters, prescriptions, observations, conditions, allergies, medicationHistory, immunizations, familyHistory, labResults, vitalSigns, medicalAids, invoices, payments, claims, documents, messages, consents, correctionRequests] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: session.userId, practiceId: session.practiceId },
      select: {
        id: true, email: true, firstName: true, lastName: true, preferredName: true,
        dateOfBirth: true, sexAtBirth: true, genderIdentity: true, phone: true,
        alternatePhone: true, addressLine1: true, addressLine2: true, suburb: true,
        city: true, province: true, postalCode: true, country: true,
        preferredLanguage: true, emergencyContactName: true,
        emergencyContactRelationship: true, emergencyContactPhone: true,
        smsRemindersEnabled: true,
      },
    }),
    prisma.appointment.findMany({ where: practiceScope, orderBy: { scheduledAt: "asc" }, select: { scheduledAt: true, durationMinutes: true, status: true, reason: true } }),
    prisma.encounter.findMany({ where: practiceScope, orderBy: { startedAt: "asc" }, select: { startedAt: true, endedAt: true, status: true, chiefComplaint: true, diagnosis: true, notes: true } }),
    prisma.prescription.findMany({ where: { ...scope, encounter: { practiceId: session.practiceId } }, orderBy: { createdAt: "asc" }, select: { medication: true, dosage: true, route: true, frequency: true, duration: true, quantity: true, refills: true, instructions: true, status: true, createdAt: true } }),
    prisma.observation.findMany({ where: scope, orderBy: { recordedAt: "asc" }, select: { type: true, name: true, value: true, unit: true, recordedAt: true } }),
    prisma.patientCondition.findMany({ where: scope, orderBy: { createdAt: "asc" }, select: { name: true, codeSystem: true, code: true, status: true, onsetDate: true, resolvedDate: true, notes: true } }),
    prisma.patientAllergy.findMany({ where: scope, orderBy: { createdAt: "asc" }, select: { substance: true, reaction: true, severity: true, status: true, onsetDate: true, notes: true } }),
    prisma.medicationStatement.findMany({ where: scope, orderBy: { recordedAt: "asc" }, select: { medication: true, strength: true, dosage: true, route: true, frequency: true, instructions: true, status: true, source: true, startedAt: true, endedAt: true, notes: true, recordedAt: true } }),
    prisma.immunization.findMany({ where: scope, orderBy: { createdAt: "asc" }, select: { vaccine: true, productName: true, manufacturer: true, lotNumber: true, doseNumber: true, route: true, site: true, status: true, administeredAt: true, nextDueAt: true, notes: true } }),
    prisma.familyHistory.findMany({ where: scope, orderBy: { createdAt: "asc" }, select: { relationship: true, condition: true, codeSystem: true, code: true, ageAtOnset: true, notes: true } }),
    prisma.labResult.findMany({ where: scope, orderBy: { resultAt: "asc" }, select: { testName: true, codeSystem: true, code: true, resultValue: true, numericValue: true, unit: true, referenceRange: true, interpretation: true, status: true, collectedAt: true, resultAt: true, releasedAt: true, notes: true } }),
    prisma.vitalSign.findMany({ where: scope, orderBy: { measuredAt: "asc" }, select: { kind: true, value: true, systolic: true, diastolic: true, unit: true, measuredAt: true, method: true, bodySite: true, notes: true } }),
    prisma.patientMedicalAid.findMany({ where: scope, orderBy: { createdAt: "asc" }, select: { schemeName: true, schemeCode: true, planName: true, membershipNumber: true, dependantCode: true, principalMemberName: true, relationshipToPrincipal: true, preAuthorizationNumber: true, validFrom: true, validThrough: true, isPrimary: true, notes: true } }),
    prisma.invoice.findMany({ where: practiceScope, orderBy: { createdAt: "asc" }, select: { amount: true, patientShare: true, schemeShare: true, status: true, dueDate: true, createdAt: true, lines: { select: { tariffCode: true, icd10Code: true, description: true, quantity: true, unitPrice: true, amount: true } }, payments: { orderBy: { recordedAt: "asc" }, select: { amount: true, method: true, payerType: true, reference: true, recordedAt: true } } } }),
    prisma.payment.findMany({ where: practiceScope, orderBy: { recordedAt: "asc" }, select: { amount: true, method: true, payerType: true, reference: true, recordedAt: true } }),
    prisma.claim.findMany({ where: practiceScope, orderBy: { createdAt: "asc" }, select: { payer: true, schemeCode: true, claimNumber: true, amount: true, amountAuthorised: true, amountPaid: true, status: true, rejectReason: true, submittedAt: true, responseAt: true, adjudicatedAt: true, createdAt: true, events: { orderBy: { createdAt: "asc" }, select: { type: true, description: true, createdAt: true } } } }),
    prisma.patientDocument.findMany({ where: practiceScope, orderBy: { createdAt: "asc" }, select: { name: true, fileUrl: true, contentType: true, size: true, createdAt: true } }),
    prisma.portalMessage.findMany({ where: practiceScope, orderBy: { createdAt: "asc" }, select: { senderType: true, body: true, readAt: true, createdAt: true } }),
    prisma.patientConsent.findMany({ where: practiceScope, orderBy: { acceptedAt: "asc" }, select: { noticeVersion: true, acceptedAt: true } }),
    prisma.patientCorrectionRequest.findMany({ where: practiceScope, orderBy: { createdAt: "asc" }, select: { requestedFields: true, requestedChanges: true, status: true, reviewNote: true, reviewedAt: true, createdAt: true } }),
  ]);

  if (!patient) return new Response("Patient account not found.", { status: 404 });
  await logSensitiveRecordAccess(session, {
    resourceType: "POPIA_RECORDS_EXPORT",
    resourceId: session.userId,
    metadata: { format: "JSON", version: 1 },
  });

  const exportData = {
    generatedAt: new Date().toISOString(),
    format: "MediCore patient records export",
    patient,
    records: {
      appointments, encounters, prescriptions, observations, conditions, allergies,
      medicationHistory, immunizations, familyHistory, labResults, vitalSigns,
      medicalAids, invoices, payments, claims, documents, messages, consents,
      correctionRequests,
    },
  };
  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="medicore-patient-records.json"',
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
