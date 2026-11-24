import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { StudentsPage } from "@/components/screens/students";

export const Route = createFileRoute("/admin/students")({ head: () => ({ meta: [{ title: "Students | Admin | Kids Parliament" }] }), component: () => <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><StudentsPage /></AppShell></RequireRole> });
