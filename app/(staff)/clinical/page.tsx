import { StaffDashboard } from "@/components/staff-dashboard";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export default async function ClinicalPage() {
  const session = await requirePermission("encounter:read");
  const practitionerScope =
    session.role === "PRACTITIONER" ? { practitionerId: session.userId } : {};
  const [activeEncounters, activePrescriptions, observations] = await Promise.all([
    prisma.encounter.count({
      where: {
        practiceId: session.practiceId,
        ...practitionerScope,
        status: "IN_PROGRESS",
      },
    }),
    prisma.prescription.count({
      where: {
        encounter: { practiceId: session.practiceId, ...practitionerScope },
        status: "ACTIVE",
      },
    }),
    prisma.observation.count({
      where: {
        patient: { practiceId: session.practiceId },
        ...(session.role === "PRACTITIONER"
          ? { recordedById: session.userId }
          : {}),
      },
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
        ...(session.role === "PRACTITIONER"
          ? [{ href: "/clinical/new", label: "New encounter" }]
          : []),
        { href: "/patients", label: "Find patient" },
        { href: "/calendar", label: "Open calendar" },
      ]}
    />
  );
}
