import { requireUser } from "@/lib/auth";
import { parseCurrentState } from "@/lib/parse-state";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  await requireUser();

  const state = parseCurrentState();

  return <DashboardClient state={state} />;
}
