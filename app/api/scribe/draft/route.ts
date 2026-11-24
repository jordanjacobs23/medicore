import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authorization/require-permission";
import { PATIENT_PURPOSE_CONSENT_VERSION } from "@/lib/patient-consents";
import { logSensitiveRecordAccess } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type DraftRequest = {
  patientId?: string;
  transcript?: string;
  chiefComplaint?: string;
};

const codingRules = [
  { terms: ["chest pain", "angina", "cardiac"], system: "ICD-10-CM", code: "R07.9", description: "Chest pain, unspecified", confidence: 72 },
  { terms: ["headache", "migraine"], system: "ICD-10-CM", code: "R51.9", description: "Headache, unspecified", confidence: 68 },
  { terms: ["cough", "bronchitis", "respiratory"], system: "ICD-10-CM", code: "R05.9", description: "Cough, unspecified", confidence: 66 },
  { terms: ["fever", "pyrexia"], system: "ICD-10-CM", code: "R50.9", description: "Fever, unspecified", confidence: 70 },
  { terms: ["hypertension", "high blood pressure"], system: "ICD-10-CM", code: "I10", description: "Essential (primary) hypertension", confidence: 74 },
  { terms: ["diabetes", "hyperglycemia"], system: "ICD-10-CM", code: "E11.9", description: "Type 2 diabetes mellitus without complications", confidence: 70 },
];

export async function POST(request: Request) {
  const session = await requirePermission("encounter:create");
  const body = (await request.json()) as DraftRequest;
  const patientId = String(body.patientId ?? "").trim();
  const transcript = String(body.transcript ?? "").trim();
  const chiefComplaint = String(body.chiefComplaint ?? "").trim();

  if (!patientId || transcript.length < 20) {
    return NextResponse.json({ error: "A patient and a transcript of at least 20 characters are required." }, { status: 400 });
  }
  if (transcript.length > 20000) {
    return NextResponse.json({ error: "Transcript is too long." }, { status: 400 });
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found in this practice." }, { status: 404 });

  const consent = await prisma.patientPurposeConsent.findFirst({
    where: {
      practiceId: session.practiceId,
      patientId,
      purpose: "AI_SCRIBE",
      scopeVersion: PATIENT_PURPOSE_CONSENT_VERSION,
    },
    orderBy: { sequence: "desc" },
  });
  if (!consent?.granted) {
    return NextResponse.json({ error: "Active AI scribe consent is required before generating a draft." }, { status: 403 });
  }

  await logSensitiveRecordAccess(session, {
    action: "CREATE",
    resourceType: "AI_SCRIBE_DRAFT",
    resourceId: patientId,
  });

  const lower = `${chiefComplaint} ${transcript}`.toLowerCase();
  const sentences = transcript
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const subjective = sentences
    .filter((sentence) => /\b(i|patient|complains|reports|feels|says|started|worse|better)\b/i.test(sentence))
    .slice(0, 6)
    .join(" ") || (chiefComplaint ? `Patient reports: ${chiefComplaint}.` : "Patient history captured in the consultation transcript.");
  const objective = sentences
    .filter((sentence) => /\b(exam|vital|observed|temperature|pressure|rate|normal|findings|shows)\b/i.test(sentence))
    .slice(0, 6)
    .join(" ") || "No explicit examination findings were identified in the transcript.";
  const likely = codingRules.filter((rule) => rule.terms.some((term) => lower.includes(term))).slice(0, 3);
  const assessment = likely.length
    ? likely.map((item) => `${item.description} (${item.code})`).join("; ")
    : "Clinical assessment requires practitioner review.";
  const plan = sentences
    .filter((sentence) => /\b(plan|follow|review|medication|prescribe|recommend|return|refer|test)\b/i.test(sentence))
    .slice(0, 6)
    .join(" ") || "Plan requires practitioner review and confirmation.";

  const scribe = await prisma.$transaction(async (tx) => {
    const created = await tx.scribeSession.create({
      data: {
        practiceId: session.practiceId,
        patientId,
        practitionerId: session.userId,
        transcript,
        status: "GENERATED",
        draftSubjective: subjective,
        draftObjective: objective,
        draftAssessment: assessment,
        draftPlan: plan,
        draftDiagnosis: likely[0]?.description ?? null,
      },
    });
    await tx.codingSuggestion.createMany({
      data: likely.map((item) => ({
        practiceId: session.practiceId,
        patientId,
        practitionerId: session.userId,
        scribeSessionId: created.id,
        system: item.system,
        code: item.code,
        description: item.description,
        rationale: "Suggested from terms detected in the consultation transcript.",
        confidence: item.confidence,
      })),
    });
    return created;
  });

  return NextResponse.json({
    scribeSessionId: scribe.id,
    draft: {
      subjective,
      objective,
      assessment,
      plan,
      diagnosis: likely[0]?.description ?? "",
    },
    codingSuggestions: likely,
  });
}
