// Pure grading rules. No UI code.
import { CORE_SUBJECT_IDS, ELECTIVES_COUNTED, SUBJECTS } from "../constants";
import type { GradeBand, ScoreValue, Subject, SubjectStrength } from "../types";

/** Grade band for a numeric score (0-100). Falls back to the lowest band. */
export function scoreToGrade(score: number, scale: GradeBand[]): GradeBand {
  const band = scale.find((b) => score >= b.min && score <= b.max);
  if (band) return band;
  const sorted = [...scale].sort((a, b) => b.grade - a.grade);
  return sorted[0] ?? { min: 0, max: 100, grade: 9, description: "Fail" };
}

/** Absent counts as 0; null (not entered) stays null. */
export function scoreToNumber(v: ScoreValue): number | null {
  if (v === null) return null;
  return v === "absent" ? 0 : v;
}

/** Grade for a score value. Absent = lowest grade (9). Not entered = null. */
export function gradeForValue(v: ScoreValue, scale: GradeBand[]): GradeBand | null {
  if (v === null) return null;
  if (v === "absent") return [...scale].sort((a, b) => b.grade - a.grade)[0] ?? null;
  return scoreToGrade(v, scale);
}

export interface TotalResult {
  total: number;
  countedSubjectIds: string[];
  complete: boolean;
}

/** Total = 4 core subjects + best 2 of the other 6 (by score), out of 600. Missing counts as 0. */
export function totalBestSix(scores: Record<string, ScoreValue>, subjects: Subject[] = SUBJECTS): TotalResult {
  const num = (id: string) => scoreToNumber(scores[id] ?? null) ?? 0;
  const core = subjects.filter((s) => CORE_SUBJECT_IDS.includes(s.id)).map((s) => s.id);
  const others = subjects
    .filter((s) => !CORE_SUBJECT_IDS.includes(s.id))
    .map((s) => s.id)
    .sort((a, b) => num(b) - num(a))
    .slice(0, ELECTIVES_COUNTED);
  const counted = [...core, ...others];
  return {
    total: counted.reduce((sum, id) => sum + num(id), 0),
    countedSubjectIds: counted,
    complete: subjects.every((s) => (scores[s.id] ?? null) !== null),
  };
}

export const isPass = (score: number, passMark: number) => score >= passMark;
export const isTotalPass = (total: number, totalPassMark: number) => total >= totalPassMark;

/** STRONG = 70%+ passed, FAIR = 50-69%, WEAK = under 50%. */
export function strengthFor(passPct: number): SubjectStrength {
  if (passPct >= 70) return "STRONG";
  if (passPct >= 50) return "FAIR";
  return "WEAK";
}

/** Parses a score input. Empty string = clear. */
export function parseScoreInput(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d+$/.test(t)) return { ok: false, error: "Whole number only" };
  const n = Number(t);
  if (n < 0 || n > 100) return { ok: false, error: "0 to 100" };
  return { ok: true, value: n };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
