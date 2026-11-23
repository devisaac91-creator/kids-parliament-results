import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { AppShell, RequireRole } from "@/components/app-shell";
import { useClasses, usePeriods, useClassAnalysis } from "@/hooks/use-api";
import { Picker, periodOptions, classOptions } from "@/components/pickers";
import { ReportView } from "@/components/report-view";
import { Button } from "@/components/ui/button";
import { printPage } from "@/lib/export";

const ADMIN_NAV = [{ to: "/admin", label: "Overview", exact: true }, { to: "/admin/scores", label: "Scores" }, { to: "/admin/reports", label: "Reports" }, { to: "/admin/slips", label: "Result Slips" }, { to: "/admin/settings", label: "Settings" }, { to: "/admin/audit", label: "Activity Log" }];
export const Route = createFileRoute("/admin/reports")({ head: () => ({ meta: [{ title: "Class Performance Reports | Kids Parliament" }] }), component: AdminReportsRoute });

function AdminReportsRoute() {
  const { data: periods } = usePeriods(); const { data: classes } = useClasses();
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? ""); const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const { data: analysis } = useClassAnalysis(periodId, classId);
  return <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><h1 className="text-xl font-bold">Subject Performance Analysis</h1><Button size="sm" onClick={() => printPage("Class performance report") }><Printer className="mr-1.5 h-4 w-4"/>Print / Save PDF</Button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden"><Picker label="Exam Period" value={periodId} onChange={setPeriodId} options={periodOptions(periods)}/><Picker label="Class" value={classId} onChange={setClassId} options={classOptions(classes)}/></div>{analysis ? <div className="overflow-x-auto"><ReportView data={analysis}/></div> : <p className="text-sm text-muted-foreground">Select a period and class to preview performance.</p>}</div></AppShell></RequireRole>;
}
