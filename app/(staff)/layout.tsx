import { forbidden, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { Suspense } from "react";
import { StaffSidebarShell } from "@/components/navigation/staff-sidebar";
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

  const links: {
    href: string;
    label: string;
    badgeCount?: number;
    children?: { href: string; label: string }[];
  }[] = [
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
    links.push({
      href: "/practice",
      label: "Practice",
      children: [
        { href: "/practice/staff", label: "Staff Directory" },
        { href: "/practice/schedules", label: "Practitioner Schedules" },
      ],
    });
    links.push({ href: "/practice/settings", label: "Settings" });
  }

  return (
    <>
      <StaffSidebarShell links={links}>{children}</StaffSidebarShell>
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
