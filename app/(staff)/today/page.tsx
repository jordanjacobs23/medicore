import { requirePermission } from "@/lib/authorization/require-permission";
import { StaffDashboard } from "@/components/staff-dashboard";
import { prisma } from "@/lib/prisma";

export default async function TodayPage() {
  const session = await requirePermission("appointment:read");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const appointments = await prisma.appointment.count({
    where: {
      practiceId: session.practiceId,
      ...(session.role === "PRACTITIONER"
        ? { practitionerId: session.userId }
        : {}),
      scheduledAt: { gte: today, lt: tomorrow },
    },
  });

  return (
    <StaffDashboard
      title="Today"
      description="Your focused start of day for appointments, patients, and clinical work."
      cards={[
        { label: "Appointments today", value: appointments },
        { label: "Waiting", value: 0 },
        { label: "Open encounters", value: 0 },
        { label: "Tasks", value: 0 },
      ]}
      actions={[
        { href: "/calendar", label: "Open calendar" },
        { href: "/patients", label: "Find patient" },
      ]}
    />
  );
}