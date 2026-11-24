import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { ClassesPage } from "@/components/screens/management";

export const Route = createFileRoute("/admin/classes")({ head: () => ({ meta: [{ title: "Classes | Admin | Kids Parliament" }] }), component: () => <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><ClassesPage /></AppShell></RequireRole> });
