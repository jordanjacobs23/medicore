import { requirePermission } from "@/lib/authorization/require-permission";

export default async function TodayPage() {
  await requirePermission("appointment:read");

  return <main>Today</main>;
}