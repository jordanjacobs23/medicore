import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { POPIA_NOTICE_VERSION } from "@/lib/privacy";
import { PopiaNotice } from "@/components/popia-notice";

async function PatientContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session || session.userType !== "PATIENT") {
    redirect("/sign-in");
  }

  const consent = await prisma.patientConsent.findUnique({
    where: {
      practiceId_patientId_noticeVersion: {
        practiceId: session.practiceId,
        patientId: session.userId,
        noticeVersion: POPIA_NOTICE_VERSION,
      },
    },
    select: { id: true },
  });

  return (
    <>
      <PopiaNotice open={!consent} noticeVersion={POPIA_NOTICE_VERSION} />
      {children}
    </>
  );
}

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<main>Loading...</main>}>
      <PatientContent>{children}</PatientContent>
    </Suspense>
  );
}