import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionContext();

  if (!session || session.userType !== "STAFF") {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.portalMessage.count({
    where: {
      practiceId: session.practiceId,
      senderType: "PATIENT",
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
