import { DEFAULT_GRADE_SCALE, DEFAULT_SUBJECT_PASS_MARK, DEFAULT_TOTAL_PASS_MARK, SUBJECTS } from "@/constants";
import type { AuditEntry, ClassRoom, ExamPeriod, Score, Settings, Student, TeacherAssignment, User } from "@/types";

export interface MockUser extends User { password: string }
export interface MockDb {
  users: MockUser[];
  students: Student[];
  classes: ClassRoom[];
  periods: ExamPeriod[];
  scores: Record<string, Score>; // key: period|student|subject
  assignments: TeacherAssignment[];
  audit: AuditEntry[];
  settings: Settings;
}

export const scoreKey = (periodId: string, studentId: string, subjectId: string) => `${periodId}|${studentId}|${subjectId}`;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function makeParentCode(rand: () => number = Math.random) {
  let s = "KP-";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}

const MALE = ["Kwame", "Kofi", "Yaw", "Kwabena", "Kwaku", "Kojo", "Kwesi", "Nana", "Elikem", "Selorm", "Fiifi", "Ebo", "Nii", "Sena", "Delali", "Mawuli", "Joseph", "Daniel", "Emmanuel", "Samuel"];
const FEMALE = ["Ama", "Akosua", "Abena", "Afia", "Adwoa", "Yaa", "Esi", "Efua", "Akua", "Adjoa", "Naa", "Dzifa", "Enyonam", "Esinam", "Mansa", "Grace", "Abigail", "Priscilla", "Gifty", "Comfort"];
const LAST = ["Mensah", "Asante", "Boateng", "Owusu", "Osei", "Agyeman", "Addo", "Appiah", "Darko", "Quaye", "Tetteh", "Amoah", "Ofori", "Annan", "Kumi", "Sarpong", "Acheampong", "Frimpong", "Nkrumah", "Adjei", "Badu", "Opoku", "Larbi", "Ansah"];

export function createSeed(): MockDb {
  const r = rng(20261);
  const now = new Date("2026-11-01T08:00:00Z").toISOString();
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)] as T;

  const classes: ClassRoom[] = [7, 8, 9].map((l) => ({ id: `c${l}`, name: `Basic ${l}`, level: l, archived: false }));
  const users: MockUser[] = [
    { id: "u-admin", fullName: "Mr. Dan-Derrick Believe", email: "admin@kidsparliament.edu.gh", password: "admin123", role: "admin", status: "active", createdAt: now },
    { id: "u-t1", fullName: "Ama Owusu", email: "teacher@kidsparliament.edu.gh", password: "teacher123", role: "teacher", status: "active", createdAt: now },
    { id: "u-t2", fullName: "Kwesi Appiah", email: "kwesi@kidsparliament.edu.gh", password: "teacher123", role: "teacher", status: "active", createdAt: now },
    { id: "u-t3", fullName: "Efua Tetteh", email: "efua@kidsparliament.edu.gh", password: "teacher123", role: "teacher", status: "pending", createdAt: now },
  ];
  const assignments: TeacherAssignment[] = [];
  const assign = (teacherId: string, subjectId: string, classId: string) => assignments.push({ id: `a${assignments.length + 1}`, teacherId, subjectId, classId });
  classes.forEach((c) => { assign("u-t1", "math", c.id); assign("u-t2", "eng", c.id); assign("u-t2", "soc", c.id); });
  assign("u-t1", "sci", "c8");

  const students: Student[] = [];
  const ability: Record<string, number> = {};
  const used = new Set<string>();
  classes.forEach((c, ci) => {
    const n = 19 + ci; // 19, 20, 21
    for (let i = 0; i < n; i++) {
      const gender = r() < 0.5 ? "M" : "F";
      let name = "";
      do { name = `${pick(gender === "M" ? MALE : FEMALE)} ${pick(LAST)}`; } while (used.has(name));
      used.add(name);
      const id = `s${c.level}-${String(i + 1).padStart(2, "0")}`;
      students.push({ id, fullName: name, gender, classId: c.id, parentCode: makeParentCode(r), status: "active", createdAt: now });
      ability[id] = 30 + r() * 55;
    }
  });
  // stable demo parent code
  if (students[20]) students[20].parentCode = "KP-DEMO08";

  const periods: ExamPeriod[] = [
    { id: "p-2026-08", name: "August 2026", month: "2026-08", status: "published", createdAt: now },
    { id: "p-2026-09", name: "September 2026", month: "2026-09", status: "published", createdAt: now },
    { id: "p-2026-10", name: "October 2026", month: "2026-10", status: "open", createdAt: now },
  ];
  const difficulty: Record<string, number> = { math: -8, eng: 2, sci: -4, soc: 4, rme: 10, cad: 8, comp: 3, ctech: 5, french: -12, ghl: 6 };
  const scores: Record<string, Score> = {};
  periods.forEach((p, pi) => {
    students.forEach((s) => {
      SUBJECTS.forEach((sub) => {
        if (p.status === "open") {
          // partially entered: maths/english mostly done, others patchy
          const done = sub.id === "math" || sub.id === "eng" ? r() < 0.85 : r() < 0.35;
          if (!done) return;
        }
        const absent = r() < 0.02;
        const base = (ability[s.id] ?? 50) + (difficulty[sub.id] ?? 0) + pi * 2 + (r() - 0.5) * 24;
        const value = absent ? "absent" : Math.max(5, Math.min(99, Math.round(base)));
        const k = scoreKey(p.id, s.id, sub.id);
        scores[k] = { id: k, periodId: p.id, studentId: s.id, subjectId: sub.id, value, updatedAt: now, updatedBy: "u-admin" };
      });
    });
  });

  return {
    users, students, classes, periods, scores, assignments,
    audit: [{ id: "log1", at: now, actorId: "u-admin", actorName: "Mr. Dan-Derrick Believe", action: "system.seed", entity: "system", entityId: "-", details: "Demo data created" }],
    settings: {
      schoolName: "Kids Parliament Educational Centre",
      motto: "Knowledge Is Power",
      gradeScale: DEFAULT_GRADE_SCALE,
      subjectPassMark: DEFAULT_SUBJECT_PASS_MARK,
      totalPassMark: DEFAULT_TOTAL_PASS_MARK,
      logoUrl: "/assets/logo.png",
      stampUrl: "/assets/stamp.png",
      signatureUrl: "/assets/signature.png",
      signatoryName: "Mr. Dan-Derrick Believe",
      signatoryPosition: "Head, Examination Committee",
      signupCode: "KPEC2026",
    },
  };
}
