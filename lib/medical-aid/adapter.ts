import "server-only";

import type { ClaimStatus, Prisma } from "@prisma/client";

export type ClaimSubmissionPayload = {
  claimId: string;
  claimNumber: string | null;
  schemeCode: string;
  memberNumber: string;
  dependantCode: string | null;
  amount: string;
  lines: Array<{
    tariffCode: string;
    icd10Code: string;
    description: string;
    quantity: number;
    unitPrice: string;
    amount: string;
    modifierCodes: string[];
  }>;
};

export type ClaimSubmissionResponse = {
  status: Extract<ClaimStatus, "ACKNOWLEDGED" | "PENDING" | "APPROVED" | "PARTIALLY_APPROVED" | "REJECTED">;
  switchingRef: string;
  amountAuthorised: string | null;
  amountPaid: string | null;
  rejectReason: string | null;
  rawResponse: Prisma.InputJsonObject;
};

export interface MedicalAidAdapter {
  submit(payload: ClaimSubmissionPayload): Promise<ClaimSubmissionResponse>;
  checkStatus(switchingRef: string): Promise<ClaimSubmissionResponse>;
  reverse(switchingRef: string, reason: string): Promise<void>;
}

/**
 * Local workflow adapter only. It records a simulated gateway acknowledgement
 * and never sends patient or claim data to an external service.
 */
class SimulationMedicalAidAdapter implements MedicalAidAdapter {
  async submit(payload: ClaimSubmissionPayload): Promise<ClaimSubmissionResponse> {
    const switchingRef = `SIM-${payload.claimId.slice(-8).toUpperCase()}-${Date.now()}`;
    return {
      status: "ACKNOWLEDGED",
      switchingRef,
      amountAuthorised: null,
      amountPaid: null,
      rejectReason: null,
      rawResponse: {
        simulation: true,
        acknowledgedAt: new Date().toISOString(),
        message: "Simulated gateway acknowledgement; no scheme received this claim.",
      },
    };
  }

  async checkStatus(switchingRef: string): Promise<ClaimSubmissionResponse> {
    return {
      status: "PENDING",
      switchingRef,
      amountAuthorised: null,
      amountPaid: null,
      rejectReason: null,
      rawResponse: {
        simulation: true,
        checkedAt: new Date().toISOString(),
        message: "No live scheme response is available in simulation mode.",
      },
    };
  }

  async reverse() {
    throw new Error("Claim reversal is not available in simulation mode.");
  }
}

export const ADAPTERS: Record<string, MedicalAidAdapter> = {
  SIMULATION: new SimulationMedicalAidAdapter(),
};

export function getMedicalAidAdapter() {
  return ADAPTERS.SIMULATION;
}
