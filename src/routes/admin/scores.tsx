import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { AppShell, RequireRole } from "@/components/app-shell";
import { useClasses, usePeriods, useScores, useStudents } from "@/hooks/use-api";
import { Picker, periodOptions, classOptions, subjectOptions } from "@/components/pickers";
import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/constants";
import { downloadCsv, downloadXlsx } from "@/lib/export";

const ADMIN_NAV = [
  { to: "/admin", label: "Overview", exact: true }, { to: "/admin/scores", label: "Scores" },
  { to: "/admin/reports", label: "Reports" }, { to: "/admin/slips", label: "Result Slips" },
  { to: "/admin/settings", label: "Settings" }, { to: "/admin/audit", label: "Activity Log" },
];

export const Route = createFileRoute("/admin/scores")({ head: () => ({ meta: [{ title: "All Scores | Admin | Kids Parliament" }] }), component: AdminScoresRoute });

function AdminScoresRoute() {
  const { data: periods } = usePeriods();
  const { data: classes } = useClasses();
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? "");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const { data: students } = useStudents({ classId: classId || undefined });
  const { data: scores } = useScores(periodId, classId, subjectId || undefined);
  const selectedClass = classes.find((c) => c.id === classId);
  const selectedPeriod = periods.find((p) => p.id === periodId);
  const visibleSubjects = SUBJECTS.filter((s) => !subjectId || s.id === subjectId);
  const rows = [["Student ID", "Student Name", "Gender", ...visibleSubjects.map((s) => s.name)], ...students.map((st) => [st.id, st.fullName, st.gender, ...visibleSubjects.map((sub) => { const entry = scores.find((s) => s.studentId === st.id && s.subjectId === sub.id); return entry?.value === "absent" ? "ABS" : entry?.value ?? "-"; })])];
  const handleExport = (format: "csv" | "xlsx") => {
    const filename = `${selectedClass?.name ?? "Class"}_${selectedPeriod?.name ?? "Exam"}_Scores`;
    if (format === "csv") downloadCsv(`${filename}.csv`, rows);
    else void downloadXlsx(`${filename}.xlsx`, rows);
  };

  return <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">Score Matrix & Exports</h1><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => handleExport("csv")}><Download className="mr-1.5 h-4 w-4"/>Export CSV</Button><Button size="sm" variant="outline" onClick={() => handleExport("xlsx")}><Download className="mr-1.5 h-4 w-4"/>Export Excel</Button></div></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Picker label="Exam Period" value={periodId} onChange={setPeriodId} options={periodOptions(periods)}/><Picker label="Class" value={classId} onChange={setClassId} options={classOptions(classes)}/><Picker label="Subject Filter" value={subjectId} onChange={setSubjectId} options={[{ value: "", label: "All 10 Subjects" }, ...subjectOptions()]}/></div><div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-left text-xs"><thead className="border-b bg-muted/60 font-semibold text-muted-foreground"><tr><th className="px-3 py-2">Student ID</th><th className="px-3 py-2">Student Name</th>{visibleSubjects.map((s) => <th key={s.id} className="px-3 py-2 text-center">{s.shortName}</th>)}</tr></thead><tbody className="divide-y">{students.map((st) => <tr key={st.id} className="hover:bg-muted/30"><td className="px-3 py-2 font-mono">{st.id}</td><td className="px-3 py-2 font-medium">{st.fullName}</td>{visibleSubjects.map((sub) => { const score = scores.find((s) => s.studentId === st.id && s.subjectId === sub.id); return <td key={sub.id} className="px-3 py-2 text-center">{score?.value === "absent" ? <span className="font-semibold text-destructive">ABS</span> : (score?.value ?? <span className="text-muted-foreground">-</span>)}</td>; })}</tr>)}</tbody></table></div></div></AppShell></RequireRole>;
}
