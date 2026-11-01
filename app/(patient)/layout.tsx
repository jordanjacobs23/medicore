import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { Suspense } from "react";

async function PatientContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session || session.userType !== "PATIENT") {
    redirect("/sign-in");
  }

  return children;
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