import type { NavItem } from "./app-shell";

/** Single source for the admin menu so every admin page shows the same links. */
export const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/students", label: "Students" },
  { to: "/admin/codes", label: "Parent codes" },
  { to: "/admin/classes", label: "Classes" },
  { to: "/admin/teachers", label: "Teachers" },
  { to: "/admin/periods", label: "Exam periods" },
  { to: "/admin/scores", label: "Scores" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/slips", label: "Result slips" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/audit", label: "Activity log" },
];
