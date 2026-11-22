"use server";

import { ClaimStatus, InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requirePermission,
  requirePractitionerPatientAccess,
} from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";
import { getMedicalAidAdapter } from "@/lib/medical-aid/adapter";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function parseAmount(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Enter a valid amount with no more than two decimal places.");
  }

  const amount = new Prisma.Decimal(value);
  if (amount.lte(0)) {
    throw new Error("Amount must be greater than zero.");
  }

  return amount;
}

const MAX_CLAIM_LINE_AMOUNT = new Prisma.Decimal("9999999999.99");

type ParsedInvoiceLine = {
  id: string | null;
  tariffCode: string;
  icd10Code: string | null;
  description: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  amount: Prisma.Decimal;
  modifierCodes: string[];
};

function parseInvoiceLines(formData: FormData): ParsedInvoiceLine[] {
  const fields = ["invoiceLineId", "tariffCode", "icd10Code", "description", "quantity", "unitPrice", "modifierCodes"];
  const values = Object.fromEntries(fields.map((field) => [
    field,
    formData.getAll(field).map((value) => typeof value === "string" ? value.trim() : ""),
  ])) as Record<string, string[]>;
  const count = values.tariffCode.length;
  if (count < 1 || count > 20 || fields.some((field) => values[field].length !== count)) {
    throw new Error("Provide between one and twenty complete billing lines.");
  }

  const lines = values.tariffCode.map((tariffCode, index) => {
    const icd10Code = values.icd10Code[index];
    const description = values.description[index];
    const quantityValue = values.quantity[index];
    const unitPriceValue = values.unitPrice[index];
    if (!tariffCode || !description || !unitPriceValue) {
      throw new Error(`Billing line ${index + 1} needs a tariff code, description, and unit price.`);
    }
    if (!/^\d{1,3}$/.test(quantityValue) || Number(quantityValue) < 1) {
      throw new Error(`Billing line ${index + 1} quantity must be a whole number from 1 to 999.`);
    }
    const quantity = Number(quantityValue);
    const unitPrice = parseAmount(unitPriceValue);
    const amount = unitPrice.mul(quantity);
    if (amount.gt(MAX_CLAIM_LINE_AMOUNT)) {
      throw new Error(`Billing line ${index + 1} exceeds the supported invoice amount.`);
    }
    const modifierCodes = values.modifierCodes[index]
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);
    if (modifierCodes.some((code) => code.length > 40)) {
      throw new Error(`Billing line ${index + 1} has a modifier code that is too long.`);
    }
    return {
      id: values.invoiceLineId[index] || null,
      tariffCode,
      icd10Code: icd10Code || null,
      description,
      quantity,
      unitPrice,
      amount,
      modifierCodes,
    };
  });

  if (!lines.some((line) => line.icd10Code)) {
    throw new Error("At least one billing line needs an ICD-10-ZA diagnosis code.");
  }
  return lines;
}

async function resolvePatient(patientId: string, practiceId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, practiceId },
    select: { id: true },
  });
  if (!patient) {
    throw new Error("Patient not found in this practice.");
  }
  return patient;
}

function parseStatus(value: string) {
  if (!Object.values(InvoiceStatus).includes(value as InvoiceStatus)) {
    throw new Error("A valid invoice status is required.");
  }
  return value as InvoiceStatus;
}

export async function createInvoice(formData: FormData) {
  const session = await requirePermission("invoice:*");
  const patientId = text(formData, "patientId");
  const amountValue = text(formData, "amount");
  const status = parseStatus(text(formData, "status"));
  const dueDateValue = text(formData, "dueDate");

  if (!patientId || !amountValue) {
    throw new Error("Patient and invoice amount are required.");
  }

  const patient = await resolvePatient(patientId, session.practiceId);
  const amount = parseAmount(amountValue);
  const creator = await prisma.staff.findFirst({
    where: { id: session.userId, practiceId: session.practiceId, isActive: true },
    select: { id: true },
  });
  if (!creator) {
    throw new Error("The current staff member is not active in this practice.");
  }

  await prisma.invoice.create({
    data: {
      practiceId: session.practiceId,
      patientId: patient.id,
      createdById: creator.id,
      amount,
      status,
      dueDate: dueDateValue ? new Date(`${dueDateValue}T23:59:59`) : null,
    },
  });

  revalidatePath("/billing");
  redirect("/billing");
}

export async function updateInvoice(formData: FormData) {
  const session = await requirePermission("invoice:*");
  const invoiceId = text(formData, "invoiceId");
  const patientId = text(formData, "patientId");
  const amountValue = text(formData, "amount");
  const status = parseStatus(text(formData, "status"));
  const dueDateValue = text(formData, "dueDate");

  if (!invoiceId || !patientId || !amountValue) {
    throw new Error("Invoice, patient, and amount are required.");
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, practiceId: session.practiceId },
    select: { id: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found in this practice.");
  }

  const patient = await resolvePatient(patientId, session.practiceId);
  const amount = parseAmount(amountValue);
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      patientId: patient.id,
      amount,
      status,
      dueDate: dueDateValue ? new Date(`${dueDateValue}T23:59:59`) : null,
    },
  });

  revalidatePath("/billing");
  revalidatePath(`/billing/${invoice.id}/edit`);
  redirect("/billing");
}

export async function createClaimFromEncounter(formData: FormData) {
  const session = await requirePermission("claim:*");
  const encounterId = text(formData, "encounterId");
  const payer = text(formData, "payer");
  const schemeCode = text(formData, "schemeCode");
  const memberNumber = text(formData, "memberNumber");
  const dependantCode = text(formData, "dependantCode");
  const patientShareValue = text(formData, "patientShare");

  if (!encounterId) throw new Error("A completed encounter is required.");
  const lines = parseInvoiceLines(formData);
  const invoiceAmount = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
  if (invoiceAmount.gt(MAX_CLAIM_LINE_AMOUNT)) throw new Error("Invoice total exceeds the supported amount.");
  if (!/^(?:\d+(?:\.\d{1,2})?)?$/.test(patientShareValue)) {
    throw new Error("Enter a valid patient share with no more than two decimal places.");
  }
  const patientShare = patientShareValue ? new Prisma.Decimal(patientShareValue) : new Prisma.Decimal(0);
  if (patientShare.lt(0) || patientShare.gt(invoiceAmount)) {
    throw new Error("Patient share must be zero or a valid amount no greater than the invoice total.");
  }
  const schemeShare = invoiceAmount.minus(patientShare);
  if (schemeShare.lte(0)) throw new Error("Scheme share must be greater than zero to create a claim.");

  const encounter = await prisma.encounter.findFirst({
    where: { id: encounterId, practiceId: session.practiceId, status: "COMPLETED", signedAt: { not: null } },
    select: { id: true, patientId: true, diagnosis: true },
  });
  if (!encounter) throw new Error("Completed encounter not found in this practice.");
  if (!encounter.diagnosis) throw new Error("Record a diagnosis on the encounter before preparing a claim.");
  const existingClaim = await prisma.claim.findFirst({
    where: { practiceId: session.practiceId, encounterId: encounter.id },
    select: { id: true },
  });
  if (existingClaim) throw new Error("A claim has already been prepared for this encounter.");
  await requirePractitionerPatientAccess(encounter.patientId);

  const creator = await prisma.staff.findFirst({
    where: { id: session.userId, practiceId: session.practiceId, isActive: true },
    select: { id: true },
  });
  if (!creator) throw new Error("The current staff member is not active in this practice.");

  const claim = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const coverage = await tx.patientMedicalAid.findFirst({
      where: { patientId: encounter.patientId, isPrimary: true },
      select: { schemeName: true, schemeCode: true, membershipNumber: true, dependantCode: true },
    });
    if (!coverage) throw new Error("Set a primary medical aid on the patient chart before creating a claim.");

    const invoice = await tx.invoice.create({
      data: {
        practiceId: session.practiceId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        createdById: creator.id,
        amount: invoiceAmount,
        patientShare,
        schemeShare,
        status: InvoiceStatus.DRAFT,
        lines: {
          create: lines.map((line) => ({
            tariffCode: line.tariffCode,
            icd10Code: line.icd10Code,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
            modifierCodes: line.modifierCodes,
          })),
        },
      },
      select: { id: true },
    });

    const createdClaim = await tx.claim.create({
      data: {
        practiceId: session.practiceId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        invoiceId: invoice.id,
        submittedById: creator.id,
        payer: payer || coverage.schemeName,
        schemeCode: schemeCode || coverage.schemeCode,
        memberNumber: memberNumber || coverage.membershipNumber,
        dependantCode: dependantCode || coverage.dependantCode,
        amount: schemeShare,
      },
      select: { id: true },
    });

    await tx.claimEvent.create({
      data: {
        claimId: createdClaim.id,
        type: "DRAFT_CREATED",
        description: "Draft claim and coded invoice created from a completed encounter.",
        payload: {
          encounterId: encounter.id,
          invoiceId: invoice.id,
          lines: lines.map((line) => ({
            icd10Code: line.icd10Code,
            tariffCode: line.tariffCode,
            description: line.description,
            amount: line.amount.toFixed(2),
          })),
          diagnosis: encounter.diagnosis,
        },
      },
    });

    return createdClaim;
  });

  revalidatePath("/billing/claims");
  revalidatePath("/billing");
  revalidatePath(`/patients/${encounter.patientId}`);
  redirect(`/billing/claims/${claim.id}/edit`);
}

export async function updateClaimDetails(formData: FormData) {
  const session = await requirePermission("claim:*");
  const claimId = text(formData, "claimId");
  const payer = text(formData, "payer");
  const claimNumber = text(formData, "claimNumber");
  const schemeCode = text(formData, "schemeCode");
  const memberNumber = text(formData, "memberNumber");
  const dependantCode = text(formData, "dependantCode");
  const amountValue = text(formData, "amount");

  if (!claimId || !payer) throw new Error("Claim and payer are required.");

  const claim = await prisma.claim.findFirst({
    where: { id: claimId, practiceId: session.practiceId },
    include: { invoice: { include: { lines: true } } },
  });
  if (!claim) throw new Error("Claim not found in this practice.");
  await requirePractitionerPatientAccess(claim.patientId);
  if (!["DRAFT", "REJECTED", "DENIED"].includes(claim.status)) {
    throw new Error("Only draft or rejected claims can be edited. Keep submitted claim details unchanged.");
  }
  if (claim.invoice && (claim.invoice.practiceId !== session.practiceId || claim.invoice.patientId !== claim.patientId)) {
    throw new Error("Claim invoice does not belong to this patient and practice.");
  }

  if (!claim.invoice) {
    const amount = parseAmount(amountValue);
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: { payer, schemeCode: schemeCode || null, memberNumber: memberNumber || null, dependantCode: dependantCode || null, claimNumber: claimNumber || null, amount },
      });
      await tx.claimEvent.create({
        data: { claimId: claim.id, type: "DETAILS_UPDATED", description: "Legacy claim details updated.", payload: { amount: amount.toFixed(2) } },
      });
    });
  } else {
    const lines = parseInvoiceLines(formData);
    const patientShareValue = text(formData, "patientShare");
    if (!/^\d*(?:\.\d{1,2})?$/.test(patientShareValue)) {
      throw new Error("Enter a valid patient share with no more than two decimal places.");
    }
    const patientShare = patientShareValue ? new Prisma.Decimal(patientShareValue) : new Prisma.Decimal(0);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const currentLines = await tx.invoiceLine.findMany({ where: { invoiceId: claim.invoice!.id } });
      const currentIds = new Set(currentLines.map((line) => line.id));
      const submittedIds = lines.flatMap((line) => line.id ? [line.id] : []);
      if (new Set(submittedIds).size !== submittedIds.length || submittedIds.some((id) => !currentIds.has(id))) {
        throw new Error("One or more invoice lines no longer belong to this claim. Refresh and try again.");
      }
      const updatedIds = new Set(submittedIds);
      const untouchedAmount = currentLines
        .filter((line) => !updatedIds.has(line.id))
        .reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
      const invoiceAmount = untouchedAmount.plus(lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0)));
      if (invoiceAmount.gt(MAX_CLAIM_LINE_AMOUNT)) throw new Error("Invoice total exceeds the supported amount.");
      if (patientShare.lt(0) || patientShare.gt(invoiceAmount)) {
        throw new Error("Patient share must be between zero and the invoice total.");
      }
      const schemeShare = invoiceAmount.minus(patientShare);
      if (schemeShare.lte(0)) throw new Error("Scheme share must be greater than zero.");

      for (const line of lines) {
        const { id: lineId, ...data } = line;
        if (lineId) {
          await tx.invoiceLine.update({ where: { id: lineId }, data });
        } else {
          await tx.invoiceLine.create({ data: { invoiceId: claim.invoice!.id, ...data } });
        }
      }
      await tx.invoice.update({
        where: { id: claim.invoice!.id },
        data: { amount: invoiceAmount, patientShare, schemeShare },
      });
      await tx.claim.update({
        where: { id: claim.id },
        data: { payer, schemeCode: schemeCode || null, memberNumber: memberNumber || null, dependantCode: dependantCode || null, claimNumber: claimNumber || null, amount: schemeShare },
      });
      await tx.claimEvent.create({
        data: {
          claimId: claim.id,
          type: "DETAILS_UPDATED",
          description: "Claim and coded invoice details updated by billing staff.",
          payload: {
            lines: lines.map((line) => ({
              tariffCode: line.tariffCode,
              icd10Code: line.icd10Code,
              description: line.description,
              quantity: line.quantity,
              amount: line.amount.toFixed(2),
            })),
            patientShare: patientShare.toFixed(2),
          },
        },
      });
    });
  }

  revalidatePath("/billing/claims");
  revalidatePath("/billing");
  revalidatePath(`/billing/claims/${claim.id}/edit`);
  redirect("/billing/claims");
}

async function submitClaimWithAdapter(claimId: string, isResubmission: boolean) {
  const session = await requirePermission("claim:*");
  const claim = await prisma.claim.findFirst({
    where: { id: claimId, practiceId: session.practiceId },
    include: {
      invoice: { include: { lines: true } },
      events: { orderBy: { createdAt: "desc" }, take: 1, select: { type: true } },
    },
  });
  if (!claim) throw new Error("Claim not found in this practice.");
  await requirePractitionerPatientAccess(claim.patientId);
  if (claim.invoice && (claim.invoice.practiceId !== session.practiceId || claim.invoice.patientId !== claim.patientId)) {
    throw new Error("Claim invoice does not belong to this patient and practice.");
  }

  const canSubmit = isResubmission
    ? claim.status === "REJECTED" || claim.status === "DENIED"
    : claim.status === "DRAFT";
  if (!canSubmit) {
    throw new Error(isResubmission
      ? "Only a rejected claim can be resubmitted."
      : "Only a draft claim can be submitted.");
  }
  if (isResubmission && claim.events[0]?.type !== "DETAILS_UPDATED") {
    throw new Error("Review and save corrected claim details before resubmitting.");
  }
  if (!claim.schemeCode || !claim.memberNumber) {
    throw new Error("A scheme code and membership number are required before submission.");
  }
  if (!claim.invoice || claim.invoice.lines.length === 0) {
    throw new Error("The claim needs an invoice with coded billing lines before submission.");
  }
  if (claim.invoice.status === "VOID") throw new Error("A void invoice cannot be submitted as a claim.");
  if (
    claim.invoice.lines.some((line) => !line.tariffCode.trim()) ||
    !claim.invoice.lines.some((line) => line.icd10Code?.trim())
  ) {
    throw new Error("Add a tariff code to every line and at least one ICD-10-ZA code before submission.");
  }

  const payload = {
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    schemeCode: claim.schemeCode,
    memberNumber: claim.memberNumber,
    dependantCode: claim.dependantCode,
    amount: claim.amount.toFixed(2),
    lines: claim.invoice.lines.map((line) => ({
      tariffCode: line.tariffCode,
      icd10Code: line.icd10Code ?? "",
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice.toFixed(2),
      amount: line.amount.toFixed(2),
      modifierCodes: line.modifierCodes,
    })),
  };

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.invoice.updateMany({
      where: { id: claim.invoice!.id, status: "DRAFT" },
      data: { status: "ISSUED" },
    });
    await tx.claim.update({
      where: { id: claim.id },
      data: {
        status: isResubmission ? "RESUBMITTED" : "SUBMITTED",
        submittedAt: new Date(),
        ...(isResubmission ? { resubmissionCount: { increment: 1 } } : {}),
        switchingRef: null,
        acknowledgedAt: null,
        responseAt: null,
        adjudicatedAt: null,
        amountAuthorised: null,
        amountPaid: null,
        rejectReason: null,
        rawRequest: payload,
        rawResponse: Prisma.DbNull,
      },
    });
    await tx.claimEvent.create({
      data: {
        claimId: claim.id,
        type: isResubmission ? "RESUBMISSION_REQUESTED" : "SUBMISSION_REQUESTED",
        description: isResubmission ? "Claim resubmission requested." : "Claim submission requested.",
        payload,
      },
    });
  });

  const adapter = getMedicalAidAdapter();
  let response;
  try {
    response = await adapter.submit(payload);
  } catch (error) {
    await prisma.claimEvent.create({
      data: {
        claimId: claim.id,
        type: "SUBMISSION_ERROR",
        description: "The adapter did not return a submission response. Confirm claim status before retrying.",
        payload: { message: error instanceof Error ? error.message : "Unknown adapter error" },
      },
    });
    throw error;
  }

  const respondedAt = new Date();
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.claim.update({
      where: { id: claim.id },
      data: {
        status: response.status,
        switchingRef: response.switchingRef,
        acknowledgedAt: response.status === "ACKNOWLEDGED" ? respondedAt : undefined,
        responseAt: respondedAt,
        amountAuthorised: response.amountAuthorised
          ? new Prisma.Decimal(response.amountAuthorised)
          : null,
        amountPaid: response.amountPaid ? new Prisma.Decimal(response.amountPaid) : null,
        rejectReason: response.rejectReason,
        rawResponse: response.rawResponse,
      },
    });
    await tx.claimEvent.create({
      data: {
        claimId: claim.id,
        type: response.status,
        description: typeof response.rawResponse.message === "string"
          ? response.rawResponse.message
          : `Adapter returned ${response.status}.`,
        payload: response.rawResponse,
      },
    });
  });

  revalidatePath("/billing/claims");
  revalidatePath(`/billing/claims/${claim.id}/edit`);
}

export async function submitClaimToScheme(formData: FormData) {
  const claimId = text(formData, "claimId");
  if (!claimId) throw new Error("Claim is required.");
  await submitClaimWithAdapter(claimId, false);
}

export async function resubmitClaimToScheme(formData: FormData) {
  const claimId = text(formData, "claimId");
  if (!claimId) throw new Error("Claim is required.");
  await submitClaimWithAdapter(claimId, true);
}

export async function checkClaimStatus(formData: FormData) {
  const session = await requirePermission("claim:*");
  const claimId = text(formData, "claimId");
  const claim = await prisma.claim.findFirst({
    where: {
      id: claimId,
      practiceId: session.practiceId,
      status: { in: ["SUBMITTED", "RESUBMITTED", "ACKNOWLEDGED", "PENDING"] },
    },
    select: { id: true, patientId: true, switchingRef: true },
  });
  if (!claim || !claim.switchingRef) throw new Error("No submitted claim with a switching reference was found.");
  await requirePractitionerPatientAccess(claim.patientId);

  const response = await getMedicalAidAdapter().checkStatus(claim.switchingRef);
  const responseAt = new Date();
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.claim.update({
      where: { id: claim.id },
      data: {
        status: response.status,
        responseAt,
        acknowledgedAt: response.status === "ACKNOWLEDGED" ? responseAt : undefined,
        rawResponse: response.rawResponse,
      },
    });
    await tx.claimEvent.create({
      data: {
        claimId: claim.id,
        type: "STATUS_CHECKED",
        description: typeof response.rawResponse.message === "string"
          ? response.rawResponse.message
          : `Adapter returned ${response.status}.`,
        payload: response.rawResponse,
      },
    });
  });

  revalidatePath("/billing/claims");
  revalidatePath(`/billing/claims/${claim.id}/edit`);
}

export async function recordClaimResponse(formData: FormData) {
  const session = await requirePermission("claim:*");
  const claimId = text(formData, "claimId");
  const statusValue = text(formData, "status");
  const amountAuthorisedValue = text(formData, "amountAuthorised");
  const amountPaidValue = text(formData, "amountPaid");
  const rejectReason = text(formData, "rejectReason");
  const responseStatuses: ClaimStatus[] = [
    ClaimStatus.ACKNOWLEDGED,
    ClaimStatus.PENDING,
    ClaimStatus.APPROVED,
    ClaimStatus.PARTIALLY_APPROVED,
    ClaimStatus.REJECTED,
    ClaimStatus.DENIED,
    ClaimStatus.PAID,
    ClaimStatus.WRITTEN_OFF,
  ];
  if (!claimId || !responseStatuses.includes(statusValue as ClaimStatus)) {
    throw new Error("Choose a valid scheme response status.");
  }

  const claim = await prisma.claim.findFirst({
    where: { id: claimId, practiceId: session.practiceId },
    include: { invoice: true },
  });
  if (!claim || !claim.invoice) throw new Error("Claim invoice not found in this practice.");
  const invoice = claim.invoice;
  await requirePractitionerPatientAccess(claim.patientId);
  if (invoice.practiceId !== session.practiceId || invoice.patientId !== claim.patientId) {
    throw new Error("Claim invoice does not belong to this patient and practice.");
  }
  if (!["SUBMITTED", "RESUBMITTED", "ACKNOWLEDGED", "PENDING"].includes(claim.status)) {
    throw new Error("Only a submitted claim can receive a scheme response.");
  }

  const parseNonNegative = (value: string, label: string) => {
    if (!value) return null;
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error(`Enter a valid ${label}.`);
    return new Prisma.Decimal(value);
  };
  const amountAuthorised = parseNonNegative(amountAuthorisedValue, "authorised amount");
  const amountPaid = parseNonNegative(amountPaidValue, "paid amount");
  const status = statusValue as ClaimStatus;
  const statusesRequiringAuthorisation: ClaimStatus[] = [
    ClaimStatus.APPROVED,
    ClaimStatus.PARTIALLY_APPROVED,
    ClaimStatus.PAID,
  ];
  const adjudicatedStatuses: ClaimStatus[] = [
    ClaimStatus.APPROVED,
    ClaimStatus.PARTIALLY_APPROVED,
    ClaimStatus.REJECTED,
    ClaimStatus.DENIED,
    ClaimStatus.PAID,
    ClaimStatus.WRITTEN_OFF,
  ];
  const rejectedStatuses: ClaimStatus[] = [
    ClaimStatus.REJECTED,
    ClaimStatus.DENIED,
  ];
  if (statusesRequiringAuthorisation.includes(status) && (!amountAuthorised || amountAuthorised.lte(0))) {
    throw new Error("Enter the amount authorised by the scheme.");
  }
  if (amountAuthorised?.gt(claim.amount)) throw new Error("Authorised amount cannot exceed the amount claimed.");
  if (amountAuthorised?.gt(invoice.amount)) throw new Error("Authorised amount cannot exceed the invoice total.");
  if (amountPaid && (!amountAuthorised || amountPaid.gt(amountAuthorised))) {
    throw new Error("Paid amount cannot exceed the authorised amount.");
  }
  if (rejectedStatuses.includes(status) && !rejectReason) {
    throw new Error("Enter the scheme's rejection reason.");
  }
  if (status === ClaimStatus.PAID && (!amountPaid || amountPaid.lte(0))) {
    throw new Error("Enter the amount paid by the scheme.");
  }

  const staff = await prisma.staff.findFirst({
    where: { id: session.userId, practiceId: session.practiceId, isActive: true },
    select: { id: true },
  });
  if (!staff) throw new Error("The current staff member is not active in this practice.");

  const adjudicatedAt = adjudicatedStatuses.includes(status) ? new Date() : undefined;
  const payload = {
    status,
    amountAuthorised: amountAuthorised?.toFixed(2) ?? null,
    amountPaid: amountPaid?.toFixed(2) ?? null,
    rejectReason: rejectReason || null,
  };

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.claim.update({
      where: { id: claim.id },
      data: {
        status,
        amountAuthorised,
        amountPaid,
        rejectReason: rejectReason || null,
        acknowledgedAt: status === ClaimStatus.ACKNOWLEDGED ? new Date() : undefined,
        responseAt: new Date(),
        adjudicatedAt,
      },
    });
    if (amountAuthorised) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          schemeShare: amountAuthorised,
          patientShare: invoice.amount.minus(amountAuthorised),
          status: "ISSUED",
        },
      });
    }
    if (status === ClaimStatus.PAID && amountPaid) {
      await tx.payment.create({
        data: {
          practiceId: session.practiceId,
          patientId: claim.patientId,
          invoiceId: invoice.id,
          recordedById: staff.id,
          amount: amountPaid,
          method: "MEDICAL_AID",
          payerType: "MEDICAL_AID",
          reference: claim.switchingRef ?? claim.id,
        },
      });
      const paid = await tx.payment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });
      if ((paid._sum.amount ?? new Prisma.Decimal(0)).gte(invoice.amount)) {
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
      }
    }
    await tx.claimEvent.create({
      data: {
        claimId: claim.id,
        type: status,
        description: `Scheme response recorded as ${status}.`,
        payload,
      },
    });
  });

  revalidatePath("/billing/claims");
  revalidatePath(`/billing/claims/${claim.id}/edit`);
  revalidatePath("/billing");
}

export async function recordPayment(formData: FormData) {
  const session = await requirePermission("payment:*");
  const invoiceId = text(formData, "invoiceId");
  const amountValue = text(formData, "amount");
  const methodValue = text(formData, "method");
  const reference = text(formData, "reference");

  if (!invoiceId || !amountValue) {
    throw new Error("Invoice and payment amount are required.");
  }
  if (!Object.values(PaymentMethod).includes(methodValue as PaymentMethod)) {
    throw new Error("A valid payment method is required.");
  }

  const amount = parseAmount(amountValue);
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, practiceId: session.practiceId },
      select: { id: true, patientId: true, amount: true, status: true },
    });
    if (!invoice) {
      throw new Error("Invoice not found in this practice.");
    }
    if (invoice.status === "DRAFT" || invoice.status === "VOID") {
      throw new Error("Payments cannot be recorded for draft or void invoices.");
    }

    const paid = await tx.payment.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true },
    });
    const balance = invoice.amount.minus(paid._sum.amount ?? new Prisma.Decimal(0));
    if (amount.gt(balance)) {
      throw new Error(`Payment cannot exceed the invoice balance of R${balance.toFixed(2)}.`);
    }

    const recorder = await tx.staff.findFirst({
      where: { id: session.userId, practiceId: session.practiceId, isActive: true },
      select: { id: true },
    });
    if (!recorder) {
      throw new Error("The current staff member is not active in this practice.");
    }

    await tx.payment.create({
      data: {
        practiceId: session.practiceId,
        patientId: invoice.patientId,
        invoiceId: invoice.id,
        recordedById: recorder.id,
        amount,
        method: methodValue as PaymentMethod,
        payerType: methodValue === PaymentMethod.MEDICAL_AID ? "MEDICAL_AID" : "PATIENT",
        reference: reference || null,
      },
    });

    const remaining = balance.minus(amount);
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: remaining.isZero() ? InvoiceStatus.PAID : invoice.status },
    });
  });

  revalidatePath("/billing");
  revalidatePath(`/billing/${invoiceId}/payments/new`);
  redirect("/billing");
}
