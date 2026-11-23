import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, RequireRole } from "@/components/app-shell";
import { useClasses, usePeriods, useMe, useAssignments } from "@/hooks/use-api";
import { Picker, periodOptions, classOptions, subjectOptions } from "@/components/pickers";
import { ScoreEntry } from "@/components/score-entry";

const TEACHER_NAV = [{ to: "/teacher", label: "My Classes", exact: true }, { to: "/teacher/scores", label: "Enter Scores" }, { to: "/teacher/reports", label: "Subject Report" }];
export const Route = createFileRoute("/teacher/scores")({ head: () => ({ meta: [{ title: "Enter Marks | Kids Parliament Results" }] }), component: TeacherScoresRoute });

function TeacherScoresRoute() {
  const { data: me } = useMe();
  const { data: assignments } = useAssignments(me?.id);
  const { data: periods } = usePeriods();
  const { data: classes } = useClasses();
  const assignedClassIds = new Set(assignments.map((a) => a.classId));
  const availableClasses = classes.filter((c) => assignedClassIds.has(c.id));
  const [periodId, setPeriodId] = useState(periods.find((p) => p.status === "open")?.id ?? periods[0]?.id ?? "");
  const [classId, setClassId] = useState(availableClasses[0]?.id ?? "");
  const assignedSubjectIds = new Set(assignments.filter((a) => a.classId === classId).map((a) => a.subjectId));
  const [subjectId, setSubjectId] = useState(subjectOptions([...assignedSubjectIds])[0]?.value ?? "");
  const activePeriod = periods.find((p) => p.id === periodId);
  const isLocked = activePeriod?.status !== "open";
  const availableSubjects = subjectOptions([...assignedSubjectIds]);

  return <RequireRole role="teacher"><AppShell roleLabel="Teacher" nav={TEACHER_NAV}><div className="space-y-4"><h1 className="text-xl font-bold">Enter Student Scores</h1><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Picker label="Exam Period" value={periodId} onChange={setPeriodId} options={periodOptions(periods)}/><Picker label="Class" value={classId} onChange={(id) => { setClassId(id); const first = subjectOptions([...new Set(assignments.filter((a) => a.classId === id).map((a) => a.subjectId))])[0]?.value; setSubjectId(first ?? ""); }} options={classOptions(availableClasses)}/><Picker label="Subject" value={subjectId} onChange={setSubjectId} options={availableSubjects}/></div>{classId && subjectId && periodId ? <ScoreEntry periodId={periodId} classId={classId} subjectId={subjectId} locked={isLocked}/> : <p className="text-sm text-muted-foreground">Please select an assigned class and subject.</p>}</div></AppShell></RequireRole>;
}
