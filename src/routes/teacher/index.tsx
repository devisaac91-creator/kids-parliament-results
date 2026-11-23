import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { TeacherDashboard } from "@/components/screens/dashboard";

const TEACHER_NAV = [
  { to: "/teacher", label: "My Classes", exact: true },
  { to: "/teacher/scores", label: "Enter Scores" },
  { to: "/teacher/reports", label: "Subject Report" },
];

export const Route = createFileRoute("/teacher/")({
  head: () => ({ meta: [{ title: "Teacher Dashboard | Kids Parliament Results" }] }),
  component: TeacherIndexRoute,
});

function TeacherIndexRoute() {
  return (
    <RequireRole role="teacher">
      <AppShell roleLabel="Teacher" nav={TEACHER_NAV}>
        <TeacherDashboard />
      </AppShell>
    </RequireRole>
  );
}
