import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { StudentsPage } from "@/components/screens/students";

const ADMIN_NAV = [{ to: "/admin", label: "Overview", exact: true }, { to: "/admin/scores", label: "Scores" }, { to: "/admin/reports", label: "Reports" }, { to: "/admin/slips", label: "Result Slips" }, { to: "/admin/settings", label: "Settings" }, { to: "/admin/audit", label: "Activity Log" }];
export const Route = createFileRoute("/admin/students")({ head: () => ({ meta: [{ title: "Students | Admin | Kids Parliament" }] }), component: () => <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><StudentsPage /></AppShell></RequireRole> });
