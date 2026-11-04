import { StaffDashboard } from "@/components/staff-dashboard";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export default async function PatientsPage() {
  const session = await requirePermission("patient:read");
  const patients = await prisma.patient.count({
    where: { practiceId: session.practiceId },
  });

  return (
    <StaffDashboard
      title="Patients"
      description="Search patient records and manage registrations for this practice."
      cards={[
        { label: "Registered patients", value: patients },
        { label: "Active today", value: 0 },
        { label: "Needs review", value: 0 },
        { label: "New this month", value: 0 },
      ]}
      actions={[{ href: "/patients/new", label: "Add patient" }]}
    />
  );
}
