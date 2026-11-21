// The single contract between screens and the backend. See docs/API_CONTRACT.md.
import type {
  AuditEntry, ClassAnalysis, ClassRoom, EntryProgress, ExamPeriod, ExamPeriodStatus, Gender, ParentStudentView,
  Score, ScoreValue, Session, Settings, Student, StudentSlip, SubjectReport, TeacherAssignment, User, UserStatus,
} from "@/types";

export interface StudentFilter { classId?: string | undefined; search?: string | undefined; includeInactive?: boolean | undefined }
export interface NewStudent { fullName: string; gender: Gender; classId: string }
export interface BulkStudentRow { fullName: string; gender: Gender }
export interface ScoreQuery { periodId: string; classId: string; subjectId?: string | undefined }
export interface SaveScoreInput { periodId: string; studentId: string; subjectId: string; value: ScoreValue }
export interface AuditFilter { action?: string | undefined; actorId?: string | undefined; from?: string | undefined; to?: string | undefined }

export interface Api {
  auth: {
    signIn(email: string, password: string): Promise<Session>;
    signUp(input: { fullName: string; email: string; password: string; signupCode?: string | undefined }): Promise<Session>;
    signOut(): Promise<void>;
    me(): Promise<User | null>;
  };
  students: {
    list(filter?: StudentFilter): Promise<Student[]>;
    get(id: string): Promise<Student>;
    create(input: NewStudent): Promise<Student>;
    bulkCreate(classId: string, rows: BulkStudentRow[]): Promise<Student[]>;
    update(id: string, patch: Partial<Pick<Student, "fullName" | "gender">>): Promise<Student>;
    move(ids: string[], classId: string): Promise<void>;
    withdraw(id: string): Promise<Student>;
  };
  classes: {
    list(): Promise<ClassRoom[]>;
    create(name: string, level: number): Promise<ClassRoom>;
    rename(id: string, name: string): Promise<ClassRoom>;
    promote(id: string): Promise<{ moved: number; graduated: number }>;
  };
  teachers: {
    list(): Promise<User[]>;
    approve(id: string): Promise<User>;
    setStatus(id: string, status: Exclude<UserStatus, "pending">): Promise<User>;
    setPassword(id: string, password: string): Promise<void>;
  };
  assignments: {
    list(filter?: { teacherId?: string | undefined }): Promise<TeacherAssignment[]>;
    setForTeacher(teacherId: string, items: { subjectId: string; classId: string }[]): Promise<TeacherAssignment[]>;
  };
  examPeriods: {
    list(): Promise<ExamPeriod[]>;
    create(input: { name: string; month: string }): Promise<ExamPeriod>;
    setStatus(id: string, status: ExamPeriodStatus): Promise<ExamPeriod>;
    missingScores(id: string): Promise<number>;
  };
  scores: {
    list(query: ScoreQuery): Promise<Score[]>;
    save(input: SaveScoreInput): Promise<Score | null>;
    progress(periodId: string): Promise<EntryProgress[]>;
  };
  reports: {
    subject(q: { periodId: string; classId: string; subjectId: string }): Promise<SubjectReport>;
    classAnalysis(q: { periodId: string; classId: string }): Promise<ClassAnalysis>;
  };
  slips: {
    forStudent(q: { periodId: string; studentId: string }): Promise<StudentSlip>;
    forClass(q: { periodId: string; classId: string }): Promise<StudentSlip[]>;
  };
  parentAccess: {
    lookup(code: string): Promise<ParentStudentView>;
    slip(code: string, periodId: string): Promise<StudentSlip>;
    regenerateCode(studentId: string): Promise<Student>;
  };
  settings: {
    get(): Promise<Settings>;
    update(patch: Partial<Settings>): Promise<Settings>;
  };
  auditLog: {
    list(filter?: AuditFilter): Promise<AuditEntry[]>;
  };
}
