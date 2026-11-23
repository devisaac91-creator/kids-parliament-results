// Pure report builders used by the API layer (mock today, server later).
import { CORE_SUBJECT_IDS, SUBJECTS } from "../constants";
import { gradeForValue, isPass, isTotalPass, round1, scoreToNumber, strengthFor, totalBestSix } from "./grading";
import type { AnalysisRow, ClassAnalysis, ExamPeriod, ScoreValue, Settings, Student, StudentSlip, SubjectReport } from "../types";

/** scores[studentId][subjectId] */
export type ScoreMatrix = Record<string, Record<string, ScoreValue>>;

export function buildSlip(student: Student, className: string, period: ExamPeriod, scores: Record<string, ScoreValue>, settings: Settings): StudentSlip {
  const t = totalBestSix(scores);
  const ordered = [...SUBJECTS.filter((s) => s.core), ...SUBJECTS.filter((s) => !s.core)];
  return {
    student: { id: student.id, fullName: student.fullName, gender: student.gender },
    className,
    period,
    rows: ordered.map((s) => {
      const v = scores[s.id] ?? null;
      const g = gradeForValue(v, settings.gradeScale);
      return {
        subjectId: s.id,
        subjectName: s.name,
        core: s.core,
        value: v,
        grade: g?.grade ?? null,
        description: v === "absent" ? "Absent" : (g?.description ?? "—"),
        counted: t.countedSubjectIds.includes(s.id),
      };
    }),
    total: t.total,
    passed: isTotalPass(t.total, settings.totalPassMark),
    complete: t.complete,
    settings,
  };
}

interface SubjectStats { sat: number; absent: number; pass: number; fail: number; passPct: number; average: number; high: number; low: number }

function subjectStats(values: ScoreValue[], passMark: number): SubjectStats {
  const sat = values.filter((v): v is number => typeof v === "number");
  const absent = values.filter((v) => v === "absent").length;
  const pass = sat.filter((v) => isPass(v, passMark)).length;
  return {
    sat: sat.length,
    absent,
    pass,
    fail: sat.length - pass,
    passPct: sat.length ? round1((pass / sat.length) * 100) : 0,
    average: sat.length ? round1(sat.reduce((a, b) => a + b, 0) / sat.length) : 0,
    high: sat.length ? Math.max(...sat) : 0,
    low: sat.length ? Math.min(...sat) : 0,
  };
}

export function buildSubjectReport(args: {
  subjectId: string; classId: string; className: string; period: ExamPeriod; students: Student[];
  matrix: ScoreMatrix; previousMatrix: ScoreMatrix | null; settings: Settings;
}): SubjectReport {
  const { subjectId, students, matrix, previousMatrix, settings } = args;
  const values = students.map((s) => matrix[s.id]?.[subjectId] ?? null);
  const st = subjectStats(values, settings.subjectPassMark);
  let change: number | null = null;
  if (previousMatrix) {
    const prev = subjectStats(students.map((s) => previousMatrix[s.id]?.[subjectId] ?? null), settings.subjectPassMark);
    if (prev.sat) change = round1(st.average - prev.average);
  }
  const distribution = Array.from({ length: 9 }, () => 0);
  values.forEach((v) => {
    if (v === null) return;
    const g = gradeForValue(v, settings.gradeScale);
    if (g && g.grade >= 1 && g.grade <= 9) distribution[g.grade - 1] = (distribution[g.grade - 1] ?? 0) + 1;
  });
  const below50 = students
    .map((s) => ({ studentId: s.id, fullName: s.fullName, value: matrix[s.id]?.[subjectId] ?? null }))
    .filter((r): r is { studentId: string; fullName: string; value: number | "absent" } => r.value !== null && (scoreToNumber(r.value) ?? 0) < settings.subjectPassMark)
    .sort((a, b) => (scoreToNumber(a.value) ?? 0) - (scoreToNumber(b.value) ?? 0));
  return {
    subjectId, subjectName: SUBJECTS.find((s) => s.id === subjectId)?.name ?? subjectId,
    classId: args.classId, className: args.className, period: args.period,
    ...st, changeInAverage: change, distribution, below50, settings,
  };
}

export function buildClassAnalysis(args: {
  classId: string; className: string; period: ExamPeriod; students: Student[];
  matrix: ScoreMatrix; previousMatrix: ScoreMatrix | null; settings: Settings;
}): ClassAnalysis {
  const { students, matrix, previousMatrix, settings } = args;
  const wroteStudents = students.filter((s) => Object.values(matrix[s.id] ?? {}).some((v) => typeof v === "number"));
  const rows: AnalysisRow[] = SUBJECTS.map((sub) => {
    const st = subjectStats(students.map((s) => matrix[s.id]?.[sub.id] ?? null), settings.subjectPassMark);
    let change: number | null = null;
    if (previousMatrix) {
      const prev = subjectStats(students.map((s) => previousMatrix[s.id]?.[sub.id] ?? null), settings.subjectPassMark);
      if (prev.sat && st.sat) change = round1(st.average - prev.average);
    }
    return { subjectId: sub.id, subjectName: sub.name, sat: st.sat, pass: st.pass, fail: st.fail, passPct: st.passPct, average: st.average, high: st.high, low: st.low, change, status: strengthFor(st.passPct) };
  });
  const totals = wroteStudents.map((s) => totalBestSix(matrix[s.id] ?? {}).total);
  const passedTotal = totals.filter((t) => isTotalPass(t, settings.totalPassMark)).length;
  const averageTotal = totals.length ? round1(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
  let totalChange: number | null = null;
  if (previousMatrix) {
    const prevStudents = students.filter((s) => Object.values(previousMatrix[s.id] ?? {}).some((v) => typeof v === "number"));
    if (prevStudents.length && totals.length) {
      const prevAvg = prevStudents.reduce((a, s) => a + totalBestSix(previousMatrix[s.id] ?? {}).total, 0) / prevStudents.length;
      totalChange = round1(averageTotal - prevAvg);
    }
  }
  const withData = rows.filter((r) => r.sat > 0);
  const byPct = [...withData].sort((a, b) => b.passPct - a.passPct || b.average - a.average);
  const strongest = byPct.slice(0, 3);
  const weakest = [...byPct].reverse().slice(0, 3);

  const obs: string[] = [];
  const weakestOne = weakest[0];
  if (weakestOne) obs.push(`${weakestOne.subjectName} is the weakest area with a pass rate of ${weakestOne.passPct}% and an average of ${weakestOne.average}.`);
  const weak = withData.filter((r) => r.status === "WEAK");
  obs.push(weak.length ? `WEAK subjects needing urgent attention: ${weak.map((r) => r.subjectName).join(", ")}.` : "No subject is rated WEAK this month.");
  if (totalChange !== null) obs.push(totalChange >= 0 ? `The class average total rose by ${totalChange} marks since last month.` : `The class average total fell by ${Math.abs(totalChange)} marks since last month.`);
  else obs.push("No previous month is available for comparison.");
  const changed = withData.filter((r) => r.change !== null);
  if (changed.length) {
    const up = [...changed].sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];
    const down = [...changed].sort((a, b) => (a.change ?? 0) - (b.change ?? 0))[0];
    if (up && (up.change ?? 0) > 0) obs.push(`Biggest improvement: ${up.subjectName} (+${up.change}).`);
    if (down && (down.change ?? 0) < 0) obs.push(`Biggest drop: ${down.subjectName} (${down.change}).`);
  }
  const failed3Core = wroteStudents.filter((s) => CORE_SUBJECT_IDS.filter((id) => {
    const v = matrix[s.id]?.[id] ?? null;
    return v !== null && (scoreToNumber(v) ?? 0) < settings.subjectPassMark;
  }).length >= 3).length;
  obs.push(`${failed3Core} student${failed3Core === 1 ? "" : "s"} failed 3 or more core subjects and should receive extra support.`);

  return {
    classId: args.classId, className: args.className, period: args.period,
    wrote: wroteStudents.length, averageTotal, passedTotal, failedTotal: totals.length - passedTotal,
    rows,
    totalRow: {
      average: averageTotal,
      high: totals.length ? Math.max(...totals) : 0,
      low: totals.length ? Math.min(...totals) : 0,
      change: totalChange,
      pass: passedTotal,
      fail: totals.length - passedTotal,
      passPct: totals.length ? round1((passedTotal / totals.length) * 100) : 0,
    },
    strongest, weakest, observations: obs, settings,
  };
}
