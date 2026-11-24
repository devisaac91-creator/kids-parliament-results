import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { useClasses, usePeriods, useClassSlips } from "@/hooks/use-api";
import { Picker, periodOptions, classOptions } from "@/components/pickers";
import { SlipView } from "@/components/slip-view";
import { Button } from "@/components/ui/button";
import { printPage } from "@/lib/export";

export const Route = createFileRoute("/admin/slips")({ head: () => ({ meta: [{ title: "Result Slips | Kids Parliament Results" }] }), component: AdminSlipsRoute });

function AdminSlipsRoute() {
  const { data: periods } = usePeriods(); const { data: classes } = useClasses();
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? ""); const [classId, setClassId] = useState(classes[0]?.id ?? ""); const [selectedStudent, setSelectedStudent] = useState("all");
  const { data: slips } = useClassSlips(periodId, classId);
  const displayedSlips = selectedStudent === "all" ? slips : slips.filter((s) => s.student.id === selectedStudent);
  return <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><h1 className="text-xl font-bold">Class Result Slips</h1><Button size="sm" onClick={() => printPage("Result slips") }><Printer className="mr-1.5 h-4 w-4"/>Print {selectedStudent === "all" ? `All (${slips.length})` : "Slip"}</Button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden"><Picker label="Exam Period" value={periodId} onChange={setPeriodId} options={periodOptions(periods)}/><Picker label="Class" value={classId} onChange={setClassId} options={classOptions(classes)}/><Picker label="Student" value={selectedStudent} onChange={setSelectedStudent} options={[{ value: "all", label: `Whole Class (${slips.length})` }, ...slips.map((s) => ({ value: s.student.id, label: s.student.fullName }))]}/></div><div className="space-y-8">{displayedSlips.map((slip) => <div key={slip.student.id} className="break-after-page overflow-x-auto"><SlipView slip={slip}/></div>)}{displayedSlips.length === 0 && <p className="text-sm text-muted-foreground">No result slips found for this selection.</p>}</div></div></AppShell></RequireRole>;
}
