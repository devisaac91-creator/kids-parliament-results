// In-memory + localStorage mock of the Api. Enforces the same rules a real server must.
import { PARENT_LOCKOUT_MS, PARENT_MAX_ATTEMPTS, SUBJECTS } from "@/constants";
import { buildClassAnalysis, buildSlip, buildSubjectReport, type ScoreMatrix } from "@/lib/analysis";
import { ApiError } from "@/api/errors";
import type { Api } from "@/api/types";
import type { ExamPeriod, ExamPeriodStatus, ScoreValue, Student, User } from "@/types";
import { createSeed, makeParentCode, scoreKey, type MockDb, type MockUser } from "./seed";

const DB_KEY = "kpr-mock-db-v1";
const SESSION_KEY = "kpr-mock-session";
const PARENT_KEY = "kpr-mock-parent-attempts";
const hasWindow = typeof window !== "undefined";

let db: MockDb | null = null;
function load(): MockDb {
  if (db) return db;
  if (hasWindow) {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { try { db = JSON.parse(raw) as MockDb; return db; } catch { /* reseed */ } }
  }
  db = createSeed();
  persist();
  return db;
}
function persist() { if (hasWindow && db) localStorage.setItem(DB_KEY, JSON.stringify(db)); }
const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const nowIso = () => new Date().toISOString();
const publicUser = ({ password: _p, ...u }: MockUser): User => u;

function currentUser(): MockUser | null {
  if (!hasWindow) return null;
  const id = localStorage.getItem(SESSION_KEY);
  return load().users.find((u) => u.id === id) ?? null;
}
function requireUser(...roles: ("admin" | "teacher")[]): MockUser {
  const u = currentUser();
  if (!u) throw new ApiError("UNAUTHENTICATED", "Please sign in.");
  if (u.status === "pending") throw new ApiError("PENDING_APPROVAL", "Waiting for Admin approval.");
  if (u.status === "disabled") throw new ApiError("FORBIDDEN", "Your account is disabled.");
  if (roles.length && !roles.includes(u.role)) throw new ApiError("FORBIDDEN", "You do not have access to this.");
  return u;
}
function log(actor: MockUser, action: string, entity: string, entityId: string, details: string, oldValue?: string, newValue?: string) {
  load().audit.unshift({ id: uid("log"), at: nowIso(), actorId: actor.id, actorName: actor.fullName, action, entity, entityId, details, oldValue, newValue });
}
const findPeriod = (id: string) => { const p = load().periods.find((x) => x.id === id); if (!p) throw new ApiError("NOT_FOUND", "Exam period not found."); return p; };
const findClass = (id: string) => { const c = load().classes.find((x) => x.id === id); if (!c) throw new ApiError("NOT_FOUND", "Class not found."); return c; };
const findStudent = (id: string) => { const s = load().students.find((x) => x.id === id); if (!s) throw new ApiError("NOT_FOUND", "Student not found."); return s; };
const activeIn = (classId: string) => load().students.filter((s) => s.classId === classId && s.status === "active").sort((a, b) => a.fullName.localeCompare(b.fullName));

function matrixFor(periodId: string, students: Student[]): ScoreMatrix {
  const d = load(); const m: ScoreMatrix = {};
  students.forEach((s) => { m[s.id] = {}; SUBJECTS.forEach((sub) => { const sc = d.scores[scoreKey(periodId, s.id, sub.id)]; m[s.id]![sub.id] = sc ? sc.value : null; }); });
  return m;
}
function previousPeriod(p: ExamPeriod): ExamPeriod | null {
  return [...load().periods].filter((x) => x.month < p.month && x.status !== "draft").sort((a, b) => b.month.localeCompare(a.month))[0] ?? null;
}
function canTeach(u: MockUser, subjectId: string, classId: string) {
  return u.role === "admin" || load().assignments.some((a) => a.teacherId === u.id && a.subjectId === subjectId && a.classId === classId);
}
function slipFor(student: Student, period: ExamPeriod) {
  const d = load();
  return buildSlip(student, findClass(student.classId).name, period, matrixFor(period.id, [student])[student.id] ?? {}, d.settings);
}

// Parent rate limit (a real server would do this per IP / code).
function checkParentLimit() {
  if (!hasWindow) return;
  const s = JSON.parse(sessionStorage.getItem(PARENT_KEY) ?? '{"n":0,"until":0}') as { n: number; until: number };
  if (s.until > Date.now()) throw new ApiError("RATE_LIMITED", "Too many attempts. Please try again later.");
}
function parentFail() {
  if (!hasWindow) return;
  const s = JSON.parse(sessionStorage.getItem(PARENT_KEY) ?? '{"n":0,"until":0}') as { n: number; until: number };
  s.n += 1;
  if (s.n >= PARENT_MAX_ATTEMPTS) { s.until = Date.now() + PARENT_LOCKOUT_MS; s.n = 0; }
  sessionStorage.setItem(PARENT_KEY, JSON.stringify(s));
}
function studentByCode(code: string) {
  checkParentLimit();
  const s = load().students.find((x) => x.parentCode.toUpperCase() === code.trim().toUpperCase() && x.status !== "withdrawn");
  if (!s) { parentFail(); throw new ApiError("NOT_FOUND", "We could not find a student with that code. Please check and try again."); }
  return s;
}

const STATUS_FLOW: Record<ExamPeriodStatus, ExamPeriodStatus[]> = {
  draft: ["open"], open: ["closed", "draft"], closed: ["open", "published"], published: ["closed"],
};

export const mockApi: Api = {
  auth: {
    async signIn(email, password) {
      await wait();
      const u = load().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
      if (!u || u.password !== password) throw new ApiError("UNAUTHENTICATED", "Incorrect email or password.");
      if (u.status === "disabled") throw new ApiError("FORBIDDEN", "This account has been disabled. Contact the Admin.");
      localStorage.setItem(SESSION_KEY, u.id);
      return { user: publicUser(u) };
    },
    async signUp({ fullName, email, password, signupCode }) {
      await wait();
      const d = load();
      if (signupCode !== undefined && signupCode.trim() !== d.settings.signupCode) throw new ApiError("VALIDATION", "The school sign-up code is not correct.");
      if (d.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) throw new ApiError("CONFLICT", "An account with this email already exists.");
      if (password.length < 6) throw new ApiError("VALIDATION", "Password must be at least 6 characters.");
      const u: MockUser = { id: uid("u"), fullName: fullName.trim(), email: email.trim().toLowerCase(), password, role: "teacher", status: "pending", createdAt: nowIso() };
      d.users.push(u);
      log(u, "teacher.signup", "user", u.id, `${u.fullName} signed up`);
      persist();
      localStorage.setItem(SESSION_KEY, u.id);
      return { user: publicUser(u) };
    },
    async signOut() { await wait(50); localStorage.removeItem(SESSION_KEY); },
    async me() { await wait(50); const u = currentUser(); return u ? publicUser(u) : null; },
  },

  students: {
    async list(f = {}) {
      await wait(); const u = requireUser();
      let list = load().students;
      if (u.role === "teacher") {
        const cls = load().assignments.filter((a) => a.teacherId === u.id).map((a) => a.classId);
        list = list.filter((s) => cls.includes(s.classId));
      }
      if (!f.includeInactive) list = list.filter((s) => s.status === "active");
      if (f.classId) list = list.filter((s) => s.classId === f.classId);
      if (f.search) { const q = f.search.toLowerCase(); list = list.filter((s) => s.fullName.toLowerCase().includes(q) || s.parentCode.toLowerCase().includes(q)); }
      return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
    },
    async get(id) { await wait(); requireUser("admin"); return findStudent(id); },
    async create(input) {
      await wait(); const u = requireUser("admin"); findClass(input.classId);
      if (!input.fullName.trim()) throw new ApiError("VALIDATION", "Full name is required.");
      const s: Student = { id: uid("s"), fullName: input.fullName.trim(), gender: input.gender, classId: input.classId, parentCode: makeParentCode(), status: "active", createdAt: nowIso() };
      load().students.push(s); log(u, "student.create", "student", s.id, `Added ${s.fullName}`); persist(); return s;
    },
    async bulkCreate(classId, rows) {
      await wait(300); const u = requireUser("admin"); const c = findClass(classId);
      const created = rows.map((r) => ({ id: uid("s"), fullName: r.fullName.trim(), gender: r.gender, classId, parentCode: makeParentCode(), status: "active" as const, createdAt: nowIso() }));
      load().students.push(...created); log(u, "student.bulk_create", "class", classId, `Added ${created.length} students to ${c.name}`); persist(); return created;
    },
    async update(id, patch) {
      await wait(); const u = requireUser("admin"); const s = findStudent(id);
      const old = `${s.fullName} (${s.gender})`; Object.assign(s, patch);
      log(u, "student.update", "student", id, `Edited ${s.fullName}`, old, `${s.fullName} (${s.gender})`); persist(); return s;
    },
    async move(ids, classId) {
      await wait(); const u = requireUser("admin"); const c = findClass(classId);
      ids.forEach((id) => { const s = findStudent(id); const from = findClass(s.classId).name; s.classId = classId; log(u, "student.move", "student", id, `Moved ${s.fullName}`, from, c.name); });
      persist();
    },
    async withdraw(id) {
      await wait(); const u = requireUser("admin"); const s = findStudent(id); s.status = "withdrawn";
      log(u, "student.withdraw", "student", id, `Marked ${s.fullName} as withdrawn`); persist(); return s;
    },
  },

  classes: {
    async list() { await wait(); requireUser(); return [...load().classes].filter((c) => !c.archived).sort((a, b) => a.level - b.level); },
    async create(name, level) {
      await wait(); const u = requireUser("admin");
      if (!name.trim()) throw new ApiError("VALIDATION", "Class name is required.");
      const c = { id: uid("c"), name: name.trim(), level, archived: false };
      load().classes.push(c); log(u, "class.create", "class", c.id, `Created ${c.name}`); persist(); return c;
    },
    async rename(id, name) {
      await wait(); const u = requireUser("admin"); const c = findClass(id); const old = c.name; c.name = name.trim();
      log(u, "class.rename", "class", id, "Renamed class", old, c.name); persist(); return c;
    },
    async promote(id) {
      await wait(300); const u = requireUser("admin"); const c = findClass(id); const students = activeIn(id);
      const next = load().classes.find((x) => !x.archived && x.level === c.level + 1);
      if (!next) {
        students.forEach((s) => (s.status = "graduated"));
        log(u, "class.promote", "class", id, `${students.length} leavers from ${c.name} archived`); persist();
        return { moved: 0, graduated: students.length };
      }
      if (activeIn(next.id).length) throw new ApiError("CONFLICT", `${next.name} still has students. Promote ${next.name} first.`);
      students.forEach((s) => (s.classId = next.id));
      log(u, "class.promote", "class", id, `${students.length} students promoted`, c.name, next.name); persist();
      return { moved: students.length, graduated: 0 };
    },
  },

  teachers: {
    async list() { await wait(); requireUser("admin"); return load().users.filter((u) => u.role === "teacher").map(publicUser); },
    async approve(id) {
      await wait(); const a = requireUser("admin"); const t = load().users.find((u) => u.id === id);
      if (!t) throw new ApiError("NOT_FOUND", "Teacher not found.");
      t.status = "active"; log(a, "teacher.approve", "user", id, `Approved ${t.fullName}`); persist(); return publicUser(t);
    },
    async setStatus(id, status) {
      await wait(); const a = requireUser("admin"); const t = load().users.find((u) => u.id === id);
      if (!t) throw new ApiError("NOT_FOUND", "Teacher not found.");
      const old = t.status; t.status = status; log(a, "teacher.status", "user", id, `${t.fullName}`, old, status); persist(); return publicUser(t);
    },
    async setPassword(id, password) {
      await wait(); const a = requireUser("admin"); const t = load().users.find((u) => u.id === id);
      if (!t) throw new ApiError("NOT_FOUND", "Teacher not found.");
      if (password.length < 6) throw new ApiError("VALIDATION", "Password must be at least 6 characters.");
      t.password = password; log(a, "teacher.password", "user", id, `Set a new password for ${t.fullName}`); persist();
    },
  },

  assignments: {
    async list(f = {}) {
      await wait(); const u = requireUser();
      const teacherId = u.role === "teacher" ? u.id : f.teacherId;
      return load().assignments.filter((a) => !teacherId || a.teacherId === teacherId);
    },
    async setForTeacher(teacherId, items) {
      await wait(); const a = requireUser("admin"); const d = load();
      d.assignments = d.assignments.filter((x) => x.teacherId !== teacherId);
      const created = items.map((i) => ({ id: uid("a"), teacherId, ...i }));
      d.assignments.push(...created);
      log(a, "assignment.set", "user", teacherId, `Set ${created.length} assignments`); persist(); return created;
    },
  },

  examPeriods: {
    async list() { await wait(); requireUser(); return [...load().periods].sort((a, b) => b.month.localeCompare(a.month)); },
    async create({ name, month }) {
      await wait(); const u = requireUser("admin");
      if (!/^\d{4}-\d{2}$/.test(month)) throw new ApiError("VALIDATION", "Choose a month.");
      if (load().periods.some((p) => p.month === month)) throw new ApiError("CONFLICT", "There is already an exam period for that month.");
      const p: ExamPeriod = { id: `p-${month}`, name, month, status: "draft", createdAt: nowIso() };
      load().periods.push(p); log(u, "period.create", "period", p.id, `Created ${name}`); persist(); return p;
    },
    async setStatus(id, status) {
      await wait(); const u = requireUser("admin"); const p = findPeriod(id);
      if (!STATUS_FLOW[p.status].includes(status)) throw new ApiError("VALIDATION", `Cannot change from ${p.status} to ${status}.`);
      const old = p.status; p.status = status; log(u, "period.status", "period", id, p.name, old, status); persist(); return p;
    },
    async missingScores(id) {
      await wait(); requireUser("admin"); const d = load();
      const studs = d.students.filter((s) => s.status === "active");
      return studs.length * SUBJECTS.length - studs.reduce((n, s) => n + SUBJECTS.filter((sub) => d.scores[scoreKey(id, s.id, sub.id)]).length, 0);
    },
  },

  scores: {
    async list({ periodId, classId, subjectId }) {
      await wait(); const u = requireUser();
      if (u.role === "teacher" && (!subjectId || !canTeach(u, subjectId, classId))) throw new ApiError("FORBIDDEN", "You are not assigned to this subject and class.");
      const ids = new Set(activeIn(classId).map((s) => s.id));
      return Object.values(load().scores).filter((s) => s.periodId === periodId && ids.has(s.studentId) && (!subjectId || s.subjectId === subjectId));
    },
    async save({ periodId, studentId, subjectId, value }) {
      await wait(200); const u = requireUser(); const d = load();
      const p = findPeriod(periodId); const s = findStudent(studentId);
      if (u.role === "teacher") {
        if (p.status !== "open") throw new ApiError("LOCKED", "This exam period is closed for editing.");
        if (!canTeach(u, subjectId, s.classId)) throw new ApiError("FORBIDDEN", "You are not assigned to this subject and class.");
      }
      if (value !== null && value !== "absent" && (!Number.isInteger(value) || value < 0 || value > 100)) throw new ApiError("VALIDATION", "Score must be a whole number from 0 to 100.");
      const k = scoreKey(periodId, studentId, subjectId); const prev = d.scores[k];
      const fmt = (v: ScoreValue | undefined) => (v === undefined || v === null ? "empty" : String(v));
      if ((prev?.value ?? null) === value) return prev ?? null;
      log(u, "score.update", "score", k, `${s.fullName} · ${SUBJECTS.find((x) => x.id === subjectId)?.name} · ${p.name}`, fmt(prev?.value), fmt(value));
      if (value === null) { delete d.scores[k]; persist(); return null; }
      const sc = { id: k, periodId, studentId, subjectId, value, updatedAt: nowIso(), updatedBy: u.id };
      d.scores[k] = sc; persist(); return sc;
    },
    async progress(periodId) {
      await wait(); requireUser(); const d = load();
      return d.classes.filter((c) => !c.archived).flatMap((c) => {
        const studs = activeIn(c.id);
        return SUBJECTS.map((sub) => ({ classId: c.id, subjectId: sub.id, total: studs.length, entered: studs.filter((s) => d.scores[scoreKey(periodId, s.id, sub.id)]).length }));
      });
    },
  },

  reports: {
    async subject({ periodId, classId, subjectId }) {
      await wait(); const u = requireUser();
      if (!canTeach(u, subjectId, classId)) throw new ApiError("FORBIDDEN", "You are not assigned to this subject and class.");
      const p = findPeriod(periodId); const c = findClass(classId); const studs = activeIn(classId); const prev = previousPeriod(p);
      return buildSubjectReport({ subjectId, classId, className: c.name, period: p, students: studs, matrix: matrixFor(periodId, studs), previousMatrix: prev ? matrixFor(prev.id, studs) : null, settings: load().settings });
    },
    async classAnalysis({ periodId, classId }) {
      await wait(); requireUser("admin");
      const p = findPeriod(periodId); const c = findClass(classId); const studs = activeIn(classId); const prev = previousPeriod(p);
      return buildClassAnalysis({ classId, className: c.name, period: p, students: studs, matrix: matrixFor(periodId, studs), previousMatrix: prev ? matrixFor(prev.id, studs) : null, settings: load().settings });
    },
  },

  slips: {
    async forStudent({ periodId, studentId }) { await wait(); requireUser("admin"); return slipFor(findStudent(studentId), findPeriod(periodId)); },
    async forClass({ periodId, classId }) { await wait(250); requireUser("admin"); const p = findPeriod(periodId); return activeIn(classId).map((s) => slipFor(s, p)); },
  },

  parentAccess: {
    async lookup(code) {
      await wait(300); const s = studentByCode(code);
      return { studentId: s.id, fullName: s.fullName, className: findClass(s.classId).name, publishedPeriods: [...load().periods].filter((p) => p.status === "published").sort((a, b) => b.month.localeCompare(a.month)) };
    },
    async slip(code, periodId) {
      await wait(); const s = studentByCode(code); const p = findPeriod(periodId);
      if (p.status !== "published") throw new ApiError("FORBIDDEN", "Results for this month are not yet published.");
      return slipFor(s, p);
    },
    async regenerateCode(studentId) {
      await wait(); const u = requireUser("admin"); const s = findStudent(studentId); const old = s.parentCode;
      s.parentCode = makeParentCode(); log(u, "student.code_regenerate", "student", studentId, `New parent code for ${s.fullName}`, old, s.parentCode); persist(); return s;
    },
  },

  settings: {
    async get() { await wait(80); return load().settings; },
    async update(patch) {
      await wait(); const u = requireUser("admin"); const d = load();
      d.settings = { ...d.settings, ...patch };
      log(u, "settings.update", "settings", "school", `Updated: ${Object.keys(patch).join(", ")}`); persist(); return d.settings;
    },
  },

  auditLog: {
    async list(f = {}) {
      await wait(); requireUser("admin");
      return load().audit.filter((e) => (!f.action || e.action.startsWith(f.action)) && (!f.actorId || e.actorId === f.actorId) && (!f.from || e.at >= f.from) && (!f.to || e.at <= `${f.to}T23:59:59`)).slice(0, 500);
    },
  },
};

/** Demo helper: wipe local mock data. */
export function resetMockData() { if (hasWindow) { localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); } db = null; }
