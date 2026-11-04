import { StaffDashboard } from "@/components/staff-dashboard";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export default async function CalendarPage() {
  const session = await requirePermission("appointment:read");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayAppointments, bookedAppointments] = await Promise.all([
    prisma.appointment.count({
      where: { practiceId: session.practiceId, scheduledAt: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({
      where: { practiceId: session.practiceId, status: "BOOKED" },
    }),
  ]);

  return (
    <StaffDashboard
      title="Calendar"
      description="Review today's schedule and manage upcoming patient appointments."
      cards={[
        { label: "Today", value: todayAppointments },
        { label: "Booked", value: bookedAppointments },
        { label: "Arrived", value: 0 },
        { label: "Waiting", value: 0 },
      ]}
      actions={[{ href: "/patients", label: "Find patient" }]}
    />
  );
}
