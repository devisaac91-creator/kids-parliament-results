import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer } from "lucide-react";
import { AppShell, RequireRole } from "@/components/app-shell";
import { useClasses, usePeriods, useMe, useAssignments, useSubjectReport } from "@/hooks/use-api";
import { Picker, periodOptions, classOptions, subjectOptions } from "@/components/pickers";
import { SubjectReportView } from "@/components/subject-report-view";
import { Button } from "@/components/ui/button";
import { printPage } from "@/lib/export";

const TEACHER_NAV = [{ to: "/teacher", label: "My Classes", exact: true }, { to: "/teacher/scores", label: "Enter Scores" }, { to: "/teacher/reports", label: "Subject Report" }];
export const Route = createFileRoute("/teacher/reports")({ head: () => ({ meta: [{ title: "Subject Performance Report | Kids Parliament" }] }), component: TeacherReportsRoute });

function TeacherReportsRoute() {
  const { data: me } = useMe(); const { data: assignments } = useAssignments(me?.id); const { data: periods } = usePeriods(); const { data: classes } = useClasses();
  const assignedClassIds = new Set(assignments.map((a) => a.classId)); const availableClasses = classes.filter((c) => assignedClassIds.has(c.id));
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? ""); const [classId, setClassId] = useState(availableClasses[0]?.id ?? "");
  const initialSubjects = [...new Set(assignments.filter((a) => a.classId === classId).map((a) => a.subjectId))]; const [subjectId, setSubjectId] = useState(subjectOptions(initialSubjects)[0]?.value ?? "");
  const { data: report } = useSubjectReport(periodId, classId, subjectId);
  const availableSubjects = subjectOptions([...new Set(assignments.filter((a) => a.classId === classId).map((a) => a.subjectId))]);
  return <RequireRole role="teacher"><AppShell roleLabel="Teacher" nav={TEACHER_NAV}><div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><h1 className="text-xl font-bold">Subject Performance Analysis</h1><Button size="sm" onClick={() => printPage("Subject performance report") }><Printer className="mr-1.5 h-4 w-4"/>Print Report</Button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden"><Picker label="Exam Period" value={periodId} onChange={setPeriodId} options={periodOptions(periods)}/><Picker label="Class" value={classId} onChange={(id) => { setClassId(id); const first = subjectOptions([...new Set(assignments.filter((a) => a.classId === id).map((a) => a.subjectId))])[0]?.value; setSubjectId(first ?? ""); }} options={classOptions(availableClasses)}/><Picker label="Subject" value={subjectId} onChange={setSubjectId} options={availableSubjects}/></div>{report ? <SubjectReportView r={report}/> : <p className="text-sm text-muted-foreground">Select an exam period, class, and subject to generate the analysis.</p>}</div></AppShell></RequireRole>;
}
