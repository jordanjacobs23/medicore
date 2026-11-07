"use server";

import { InvoiceStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function parseAmount(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error("Enter a valid invoice amount with no more than two decimal places.");
  }

  const amount = new Prisma.Decimal(value);
  if (amount.lte(0)) {
    throw new Error("Invoice amount must be greater than zero.");
  }

  return amount;
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
    data: { patientId: patient.id, amount, status },
  });

  revalidatePath("/billing");
  revalidatePath(`/billing/${invoice.id}/edit`);
  redirect("/billing");
}
