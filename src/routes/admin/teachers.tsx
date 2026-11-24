import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { TeachersPage } from "@/components/screens/management";

export const Route = createFileRoute("/admin/teachers")({ head: () => ({ meta: [{ title: "Teachers | Admin | Kids Parliament" }] }), component: () => <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><TeachersPage /></AppShell></RequireRole> });
