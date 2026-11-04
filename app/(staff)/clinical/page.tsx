import { StaffDashboard } from "@/components/staff-dashboard";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export default async function ClinicalPage() {
  const session = await requirePermission("encounter:read");
  const [activeEncounters, activePrescriptions, observations] = await Promise.all([
    prisma.encounter.count({
      where: { practiceId: session.practiceId, status: "IN_PROGRESS" },
    }),
    prisma.prescription.count({
      where: { encounter: { practiceId: session.practiceId }, status: "ACTIVE" },
    }),
    prisma.observation.count({
      where: { patient: { practiceId: session.practiceId } },
    }),
  ]);

  return (
    <StaffDashboard
      title="Clinical workspace"
      description="Review encounters, prescriptions, observations, and patient care activity."
      cards={[
        { label: "Active encounters", value: activeEncounters },
        { label: "Active prescriptions", value: activePrescriptions },
        { label: "Recorded observations", value: observations },
        { label: "Pending notes", value: 0 },
      ]}
      actions={[
        { href: "/patients", label: "Find patient" },
        { href: "/today", label: "Open today's work" },
      ]}
    />
  );
}
