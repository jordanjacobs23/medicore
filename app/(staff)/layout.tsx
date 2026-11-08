import { forbidden, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { Suspense } from "react";
import { StaffSidebar } from "@/components/navigation/staff-sidebar";
import { prisma } from "@/lib/prisma";

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

  const links = [
    { href: "/today", label: "Today" },
    { href: "/calendar", label: "Calendar" },
    { href: "/patients", label: "Patients" },
    { href: "/messages", label: "Messages", badgeCount: await prisma.portalMessage.count({
      where: {
        practiceId: session.practiceId,
        senderType: "PATIENT",
        readAt: null,
      },
    }) },
  ];

  if (["PRACTICE_MANAGER", "PRACTITIONER", "NURSE"].includes(session.role)) {
    links.push({ href: "/clinical", label: "Clinical" });
  }
  if (["PRACTICE_MANAGER", "BILLING_CLERK"].includes(session.role)) {
    links.push({ href: "/billing", label: "Billing" });
  }
  if (["PRACTICE_MANAGER", "BILLING_CLERK", "VIEWER"].includes(session.role)) {
    links.push({ href: "/reports", label: "Reports" });
  }
  links.push({ href: "/break-glass", label: "Break-glass" });
  if (session.role === "PRACTICE_MANAGER") {
    links.push({ href: "/practice/staff", label: "Practice" });
    links.push({ href: "/practice/settings", label: "Settings" });
  }

  return (
    <>
      <StaffSidebar links={links} />
      <div className="min-h-screen w-auto bg-[#edf2f6] md:ml-20 lg:ml-[270px] dark:bg-[#111a22]">
        {children}
      </div>
    </>
  );
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