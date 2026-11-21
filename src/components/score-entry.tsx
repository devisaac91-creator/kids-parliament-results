// Score entry list with autosave per row. Used by teachers and admin.
import { Check, Loader2, Lock, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, errorMessage } from "@/api";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useScores, useStudents } from "@/hooks/use-api";
import { parseScoreInput } from "@/lib/grading";
import type { ScoreValue, Student } from "@/types";
import { EmptyState, ErrorState, LoadingState } from "./states";

type RowState = "idle" | "saving" | "saved" | "error";

export function ScoreEntry({ periodId, classId, subjectId, locked }: { periodId: string; classId: string; subjectId: string; locked: boolean }) {
  const students = useStudents({ classId });
  const scores = useScores(periodId, classId, subjectId);
  const [values, setValues] = useState<Record<string, ScoreValue>>({});

  useEffect(() => {
    if (!scores.data) return;
    const v: Record<string, ScoreValue> = {};
    scores.data.forEach((s) => (v[s.studentId] = s.value));
    setValues(v);
  }, [scores.data]);

  const list = students.data ?? [];
  const entered = useMemo(() => list.filter((s) => (values[s.id] ?? null) !== null).length, [list, values]);

  if (students.isLoading || scores.isLoading) return <LoadingState label="Loading students…" />;
  if (students.error || scores.error) return <ErrorState error={students.error ?? scores.error} onRetry={() => { void students.refetch(); void scores.refetch(); }} />;
  if (!list.length) return <EmptyState title="No students in this class yet" />;

  return (
    <div>
      {locked && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm">
          <Lock className="h-4 w-4 shrink-0" /> This exam period is not open. Scores are locked and can only be viewed.
        </div>
      )}
      <div className="sticky top-[92px] z-10 mb-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between text-sm font-medium"><span>{entered} of {list.length} entered</span><span className="text-muted-foreground">{Math.round((entered / list.length) * 100)}%</span></div>
        <Progress value={(entered / list.length) * 100} className="mt-1.5 h-2" />
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {list.map((s, i) => (
          <ScoreRow key={s.id} index={i + 1} student={s} value={values[s.id] ?? null} locked={locked}
            onSaved={(v) => setValues((prev) => ({ ...prev, [s.id]: v }))} periodId={periodId} subjectId={subjectId} />
        ))}
      </ul>
    </div>
  );
}

function ScoreRow({ student, value, locked, onSaved, periodId, subjectId, index }: {
  student: Student; value: ScoreValue; locked: boolean; onSaved: (v: ScoreValue) => void; periodId: string; subjectId: string; index: number;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState(typeof value === "number" ? String(value) : "");
  const [state, setState] = useState<RowState>("idle");
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const absent = value === "absent";

  useEffect(() => { setText(typeof value === "number" ? String(value) : ""); }, [value]);

  async function save(v: ScoreValue) {
    setState("saving"); setErr(null);
    try {
      await api.scores.save({ periodId, studentId: student.id, subjectId, value: v });
      onSaved(v); setState("saved");
      void qc.invalidateQueries({ queryKey: ["progress"] });
    } catch (e) { setState("error"); setErr(errorMessage(e)); }
  }
  function onChange(t: string) {
    setText(t);
    const p = parseScoreInput(t);
    if (timer.current) clearTimeout(timer.current);
    if (!p.ok) { setErr(p.error); setState("error"); return; }
    setErr(null);
    if (p.value === value) return;
    timer.current = setTimeout(() => void save(p.value), 700);
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-6 text-right text-xs text-muted-foreground">{index}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{student.fullName}</p>
        <p className="h-4 text-xs">
          {err ? <span className="text-destructive">{err}</span>
            : state === "saving" ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Saving</span>
            : state === "saved" ? <span className="inline-flex items-center gap-1 text-success"><Check className="h-3 w-3" />Saved</span>
            : <span className="text-muted-foreground">{student.gender === "M" ? "Male" : "Female"}</span>}
        </p>
      </div>
      <Input inputMode="numeric" aria-label={`Score for ${student.fullName}`} className={`h-10 w-20 text-center text-base ${err ? "border-destructive" : ""}`}
        value={absent ? "" : text} placeholder={absent ? "ABS" : "–"} disabled={locked || absent}
        onChange={(e) => onChange(e.target.value)} />
      <label className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground">
        <Switch checked={absent} disabled={locked} onCheckedChange={(c) => void save(c ? "absent" : null)} aria-label={`Mark ${student.fullName} absent`} />
        Absent
      </label>
      {state === "error" && !err && <AlertCircle className="h-4 w-4 text-destructive" />}
    </li>
  );
}
