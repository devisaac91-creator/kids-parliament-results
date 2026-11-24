import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { PeriodsPage } from "@/components/screens/management";

export const Route = createFileRoute("/admin/periods")({ head: () => ({ meta: [{ title: "Exam Periods | Admin | Kids Parliament" }] }), component: () => <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><PeriodsPage /></AppShell></RequireRole> });
