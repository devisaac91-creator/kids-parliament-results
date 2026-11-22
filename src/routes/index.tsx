import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMe } from "@/hooks/use-api";
import { SignInPage, SignUpPage, ParentPage } from "@/components/screens/public";
import { AdminDashboard, TeacherDashboard } from "@/components/screens/dashboard";
import { StudentsPage } from "@/components/screens/students";
import { ClassesPage, TeachersPage, PeriodsPage } from "@/components/screens/management";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kids Parliament Results | School Portal" },
      { name: "description", content: "End-of-month examination results and score management for Kids Parliament Educational Centre." },
      { property: "og:title", content: "Kids Parliament Results" },
      { property: "og:description", content: "School examination results portal" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { data: me } = useMe();
  const [publicView, setPublicView] = useState<"signin" | "signup" | "parent">("signin");
  const [adminTab, setAdminTab] = useState<"dashboard" | "students" | "codes" | "classes" | "teachers" | "periods">("dashboard");
  const [teacherTab, setTeacherTab] = useState<"dashboard">("dashboard");

  // 1. Not signed in: render public portals
  if (!me) {
    if (publicView === "parent") {
      return (
        <div>
          <div className="border-b bg-muted/30 px-4 py-2 print:hidden text-center text-xs">
            <button
              onClick={() => setPublicView("signin")}
              className="text-primary hover:underline font-medium"
            >
              ← Back to Staff Sign In
            </button>
          </div>
          <ParentPage />
        </div>
      );
    }

    if (publicView === "signup") {
      return (
        <div>
          <div className="border-b bg-muted/30 px-4 py-2 text-center text-xs">
            <button
              onClick={() => setPublicView("signin")}
              className="text-primary hover:underline font-medium"
            >
              ← Back to Sign In
            </button>
          </div>
          <SignUpPage />
        </div>
      );
    }

    return (
      <div>
        <SignInPage />
        <div className="fixed bottom-3 right-3 z-50 flex gap-2 print:hidden">
          <button
            onClick={() => setPublicView("parent")}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow hover:opacity-90"
          >
            Parent Portal
          </button>
        </div>
      </div>
    );
  }

  // 2. Admin Portal
  if (me.role === "admin") {
    const adminNav = [
      { to: "#dashboard", label: "Overview", active: adminTab === "dashboard", onClick: () => setAdminTab("dashboard") },
      { to: "#students", label: "Students", active: adminTab === "students", onClick: () => setAdminTab("students") },
      { to: "#codes", label: "Parent Codes", active: adminTab === "codes", onClick: () => setAdminTab("codes") },
      { to: "#classes", label: "Classes", active: adminTab === "classes", onClick: () => setAdminTab("classes") },
      { to: "#teachers", label: "Teachers", active: adminTab === "teachers", onClick: () => setAdminTab("teachers") },
      { to: "#periods", label: "Exam Periods", active: adminTab === "periods", onClick: () => setAdminTab("periods") },
    ];

    return (
      <AppShell
        roleLabel="Administrator"
        nav={adminNav.map((n) => ({ to: n.to, label: n.label }))}
      >
        <div className="mb-4 flex flex-wrap gap-2 border-b pb-3 print:hidden">
          {adminNav.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {adminTab === "dashboard" && <AdminDashboard />}
        {adminTab === "students" && <StudentsPage codes={false} />}
        {adminTab === "codes" && <StudentsPage codes={true} />}
        {adminTab === "classes" && <ClassesPage />}
        {adminTab === "teachers" && <TeachersPage />}
        {adminTab === "periods" && <PeriodsPage />}
      </AppShell>
    );
  }

  // 3. Teacher Portal
  return (
    <AppShell
      roleLabel="Teacher"
      nav={[{ to: "#dashboard", label: "My Classes" }]}
    >
      <TeacherDashboard />
    </AppShell>
  );
}
