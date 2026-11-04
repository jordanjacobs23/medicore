import { forbidden, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { Suspense } from "react";

async function StaffContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/sign-in");
  }

  if (session.userType !== "STAFF") {
    forbidden();
  }

  return children;
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<main>Loading...</main>}>
      <StaffContent>{children}</StaffContent>
    </Suspense>
  );
}