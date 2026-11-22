import type { PatientConsentPurpose } from "@prisma/client";

export const PATIENT_PURPOSE_CONSENT_VERSION = "2026-11-22";

export const PATIENT_PURPOSE_CONSENT_TEXT = {
  AI_SCRIBE:
    "I agree to the use of an AI clinical scribe during my consultations. A practitioner will review and approve any AI-generated clinical notes.",
  TELEHEALTH:
    "I agree to receive healthcare services through telehealth when arranged with my practice.",
  RECORDING:
    "I agree to recording of a consultation when recording is offered. I understand I can withdraw this consent before or during a recording.",
  MARKETING:
    "I agree to receive optional practice news and marketing communications. This is not required for my care.",
  THIRD_PARTY_SHARE:
    "I agree to sharing relevant information with third parties involved in my care, such as a referred provider or diagnostic service.",
} satisfies Record<PatientConsentPurpose, string>;
