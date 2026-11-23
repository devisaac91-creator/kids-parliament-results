import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireRole } from "@/components/app-shell";
import { useSettings, useAction } from "@/hooks/use-api";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_NAV = [{ to: "/admin", label: "Overview", exact: true }, { to: "/admin/scores", label: "Scores" }, { to: "/admin/reports", label: "Reports" }, { to: "/admin/slips", label: "Result Slips" }, { to: "/admin/settings", label: "Settings" }, { to: "/admin/audit", label: "Activity Log" }];
export const Route = createFileRoute("/admin/settings")({ head: () => ({ meta: [{ title: "System Settings | Kids Parliament Results" }] }), component: AdminSettingsRoute });

function AdminSettingsRoute() {
  const { data: initialSettings } = useSettings();
  const [form, setForm] = useState(initialSettings);
  useEffect(() => setForm(initialSettings), [initialSettings]);
  const saveMutation = useAction((payload: typeof form) => api.settings.update(payload), { success: "Settings updated successfully" });
  return <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><div className="max-w-2xl space-y-6"><h1 className="text-xl font-bold">School & Grading Settings</h1><div className="space-y-4 rounded-lg border bg-card p-4"><h2 className="font-semibold">School Identity & Official Signatory</h2><div className="space-y-2"><Label>School Name</Label><Input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })}/></div><div className="space-y-2"><Label>Motto</Label><Input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })}/></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Signatory Name</Label><Input value={form.signatoryName} onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}/></div><div className="space-y-2"><Label>Signatory Title</Label><Input value={form.signatoryPosition} onChange={(e) => setForm({ ...form, signatoryPosition: e.target.value })}/></div></div></div><div className="space-y-4 rounded-lg border bg-card p-4"><h2 className="font-semibold">Security & Registration</h2><div className="space-y-2"><Label>Teacher Sign-up Passcode</Label><Input value={form.signupCode} onChange={(e) => setForm({ ...form, signupCode: e.target.value })}/><p className="text-xs text-muted-foreground">Required by new teachers during registration.</p></div></div><div className="space-y-4 rounded-lg border bg-card p-4"><h2 className="font-semibold">Passing Thresholds</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Subject Pass Mark (out of 100)</Label><Input type="number" value={form.subjectPassMark} onChange={(e) => setForm({ ...form, subjectPassMark: Number(e.target.value) })}/></div><div className="space-y-2"><Label>Total Pass Mark (out of 600)</Label><Input type="number" value={form.totalPassMark} onChange={(e) => setForm({ ...form, totalPassMark: Number(e.target.value) })}/></div></div></div><Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(form)}>{saveMutation.isPending ? "Saving..." : "Save Settings"}</Button></div></AppShell></RequireRole>;
}
