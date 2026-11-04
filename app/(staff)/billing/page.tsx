import { StaffDashboard } from "@/components/staff-dashboard";
import { requirePermission } from "@/lib/authorization/require-permission";
import { prisma } from "@/lib/prisma";

export default async function BillingPage() {
  const session = await requirePermission("invoice:read");
  const [issued, paid, overdue] = await Promise.all([
    (prisma as typeof prisma & Record<"invoice", { count: (args: unknown) => Promise<number> }>).invoice.count({ where: { practiceId: session.practiceId, status: "ISSUED" } }),
    (prisma as typeof prisma & Record<"invoice", { count: (args: unknown) => Promise<number> }>).invoice.count({ where: { practiceId: session.practiceId, status: "PAID" } }),
    (prisma as typeof prisma & Record<"invoice", { count: (args: unknown) => Promise<number> }>).invoice.count({ where: { practiceId: session.practiceId, status: "OVERDUE" } }),
  ]);

  return (
    <StaffDashboard
      title="Billing"
      description="Manage invoices, payments, and patient account balances."
      cards={[
        { label: "Issued invoices", value: issued },
        { label: "Paid invoices", value: paid },
        { label: "Overdue invoices", value: overdue },
        { label: "Pending claims", value: 0 },
      ]}
      actions={[]}
    />
  );
}
