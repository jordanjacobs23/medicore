import { StaffDashboard } from "@/components/staff-dashboard";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const session = await requirePermission("report:read");
  const [patients, staff] = await Promise.all([
    prisma.patient.count({ where: { practiceId: session.practiceId } }),
    prisma.staff.count({ where: { practiceId: session.practiceId, isActive: true } }),
  ]);
  const completedAppointments = 0;

  return (
    <StaffDashboard
      title="Practice reports"
      description="Monitor practice activity, capacity, and clinical operations."
      cards={[
        { label: "Patients", value: patients },
        { label: "Active staff", value: staff },
        { label: "Completed visits", value: completedAppointments },
        { label: "Outstanding invoices", value: 0 },
      ]}
      actions={[{ href: "/billing", label: "View billing" }]}
    />
  );
}
