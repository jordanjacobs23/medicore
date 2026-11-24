import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("encounter:update");
  const { id } = await params;
  const body = await request.json() as { accepted?: boolean };
  if (typeof body.accepted !== "boolean") {
    return NextResponse.json({ error: "A valid review decision is required." }, { status: 400 });
  }
  const suggestion = await prisma.codingSuggestion.findFirst({
    where: { id, practiceId: session.practiceId, practitionerId: session.userId },
  });
  if (!suggestion) return NextResponse.json({ error: "Coding suggestion not found." }, { status: 404 });
  const updated = await prisma.codingSuggestion.update({
    where: { id: suggestion.id },
    data: { accepted: body.accepted, reviewedAt: new Date() },
  });
  return NextResponse.json({ suggestion: updated });
}
