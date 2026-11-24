import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { AdminDashboard } from "@/components/screens/dashboard";


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
