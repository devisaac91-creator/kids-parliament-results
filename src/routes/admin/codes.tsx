import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { StudentsPage } from "@/components/screens/students";

export const Route = createFileRoute("/admin/codes")({ head: () => ({ meta: [{ title: "Parent Codes | Admin | Kids Parliament" }] }), component: () => <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><StudentsPage codes /></AppShell></RequireRole> });
