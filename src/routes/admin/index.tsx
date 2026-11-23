import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { AdminDashboard } from "@/components/screens/dashboard";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/scores", label: "Scores" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/slips", label: "Result Slips" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/audit", label: "Activity Log" },
];

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Overview | Kids Parliament Results" }] }),
  component: AdminIndexRoute,
});

function AdminIndexRoute() {
  return (
    <RequireRole role="admin">
      <AppShell roleLabel="Administrator" nav={ADMIN_NAV}>
        <AdminDashboard />
      </AppShell>
    </RequireRole>
  );
}
