// Domain types. IDs are strings, dates are ISO strings.
export type Role = "admin" | "teacher" | "parent";
export type UserStatus = "pending" | "active" | "disabled";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Exclude<Role, "parent">;
  status: UserStatus;
  createdAt: string;
}

export type Gender = "M" | "F";
export type StudentStatus = "active" | "withdrawn" | "graduated";

export interface Student {
  id: string;
  fullName: string;
  gender: Gender;
  classId: string;
  parentCode: string;
  status: StudentStatus;
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  level: number;
  archived: boolean;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  core: boolean;
}

export type ExamPeriodStatus = "draft" | "open" | "closed" | "published";

export interface ExamPeriod {
  id: string;
  name: string; // e.g. "October 2026"
  month: string; // "2026-10"
  status: ExamPeriodStatus;
  createdAt: string;
}

/** A stored score: whole number 0-100 or "absent". Missing = not entered. */
export type StoredScoreValue = number | "absent";
/** A score as seen by screens: null means not yet entered. */
export type ScoreValue = StoredScoreValue | null;

export interface Score {
  id: string;
  studentId: string;
  subjectId: string;
  periodId: string;
  value: StoredScoreValue;
  updatedAt: string;
  updatedBy: string;
}

export interface GradeBand {
  min: number;
  max: number;
  grade: number; // 1..9
  description: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string; // e.g. "score.update"
  entity: string; // e.g. "score"
  entityId: string;
  details: string;
  oldValue?: string | undefined;
  newValue?: string | undefined;
}

export interface Settings {
  schoolName: string;
  motto: string;
  gradeScale: GradeBand[];
  subjectPassMark: number;
  totalPassMark: number;
  logoUrl: string;
  stampUrl: string;
  signatureUrl: string;
  signatoryName: string;
  signatoryPosition: string;
  signupCode: string;
}

export interface Session {
  user: User;
}

export interface EntryProgress {
  classId: string;
  subjectId: string;
  entered: number;
  total: number;
}

export interface SlipRow {
  subjectId: string;
  subjectName: string;
  core: boolean;
  value: ScoreValue;
  grade: number | null;
  description: string;
  counted: boolean;
}

export interface StudentSlip {
  student: Pick<Student, "id" | "fullName" | "gender">;
  className: string;
  period: ExamPeriod;
  rows: SlipRow[];
  total: number;
  passed: boolean;
  complete: boolean;
  settings: Settings;
}

export interface SubjectReport {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  period: ExamPeriod;
  sat: number;
  absent: number;
  pass: number;
  fail: number;
  passPct: number;
  average: number;
  high: number;
  low: number;
  changeInAverage: number | null;
  distribution: number[]; // index 0 = grade 1 ... index 8 = grade 9
  below50: { studentId: string; fullName: string; value: StoredScoreValue }[];
  settings: Settings;
}

export type SubjectStrength = "STRONG" | "FAIR" | "WEAK";

export interface AnalysisRow {
  subjectId: string;
  subjectName: string;
  sat: number;
  pass: number;
  fail: number;
  passPct: number;
  average: number;
  high: number;
  low: number;
  change: number | null;
  status: SubjectStrength;
}

export interface ClassAnalysis {
  classId: string;
  className: string;
  period: ExamPeriod;
  wrote: number;
  averageTotal: number;
  passedTotal: number;
  failedTotal: number;
  rows: AnalysisRow[];
  totalRow: { average: number; high: number; low: number; change: number | null; pass: number; fail: number; passPct: number };
  strongest: AnalysisRow[];
  weakest: AnalysisRow[];
  observations: string[];
  settings: Settings;
}

export interface ParentStudentView {
  studentId: string;
  fullName: string;
  className: string;
  publishedPeriods: ExamPeriod[];
}
