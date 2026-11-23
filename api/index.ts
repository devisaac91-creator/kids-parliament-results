import { createHash, randomBytes } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { SUBJECTS, DEFAULT_GRADE_SCALE, PARENT_MAX_ATTEMPTS } from "../src/constants";
import { buildClassAnalysis, buildSlip, buildSubjectReport, type ScoreMatrix } from "../src/lib/analysis";
import { clearSessionCookie, getSessionId, setSessionCookie, signToken } from "./_auth";
import { getSql } from "./_db";
import type {
  AuditFilter, NewStudent, SaveScoreInput, StudentFilter,
} from "../src/api/types";
import type {
  ClassRoom, ExamPeriod, ExamPeriodStatus, Gender, ScoreValue, Settings, Student, User, UserStatus,
} from "../src/types";

type Sql = ReturnType<typeof getSql>;
type DbUser = {
  id: string;
  email: string;
  full_name: string;
  role: User["role"];
  teacher_status: string | null;
  created_at: string | Date;
  password_hash?: string;
};
type RateBucket = "signin" | "parent";

class ApiFault extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const STATUS_FLOW: Record<ExamPeriodStatus, ExamPeriodStatus[]> = {
  draft: ["open"],
  open: ["closed", "draft"],
  closed: ["open", "published"],
  published: ["closed"],
};
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function fail(status: number, code: string, message: string): never {
  throw new ApiFault(status, code, message);
}

function objectBody(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function requiredString(value: unknown, label: string): string {
  const result = stringValue(value);
  if (!result) fail(400, "VALIDATION", `${label} is required.`);
  return result;
}

function queryValue(req: VercelRequest, key: string): string {
  const value = req.query[key];
  return Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" ? value : "";
}

function apiPath(url: string | undefined): string {
  const pathname = (url ?? "/").split("?", 1)[0] ?? "/";
  return pathname.replace(/^\/api(?=\/|$)/, "") || "/";
}

function iso(value: string | Date | null | undefined): string {
  return value ? new Date(value).toISOString() : new Date(0).toISOString();
}

function mapStatus(status: string | null | undefined, role: string): UserStatus {
  if (role === "admin") return "active";
  if (status === "approved" || status === "active") return "active";
  if (status === "disabled") return "disabled";
  return "pending";
}

function mapUser(row: DbUser): User {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name),
    role: row.role as User["role"],
    status: mapStatus(row.teacher_status, row.role),
    createdAt: iso(row.created_at),
  };
}

function mapClass(row: Record<string, any>): ClassRoom {
  return { id: String(row["id"]), name: String(row["name"]), level: Number(row["level"]), archived: false };
}

function mapStudent(row: Record<string, any>): Student {
  const gender: Gender = row["gender"] === "M" || row["gender"] === "Male" ? "M" : "F";
  return {
    id: String(row["id"]),
    fullName: String(row["full_name"]),
    gender,
    classId: String(row["class_id"]),
    parentCode: String(row["parent_code"]),
    status: row["status"] as Student["status"],
    createdAt: iso(row["created_at"]),
  };
}

function mapPeriod(row: Record<string, any>): ExamPeriod {
  return {
    id: String(row["id"]),
    name: String(row["name"]),
    month: String(row["month"]),
    status: row["status"] as ExamPeriodStatus,
    createdAt: iso(row["created_at"]),
  };
}

function mapAssignment(row: Record<string, any>) {
  return {
    id: String(row["id"]),
    teacherId: String(row["teacher_id"]),
    classId: String(row["class_id"]),
    subjectId: String(row["subject_id"]),
  };
}

function mapScore(row: Record<string, any>) {
  return {
    id: String(row["id"]),
    periodId: String(row["period_id"]),
    studentId: String(row["student_id"]),
    subjectId: String(row["subject_id"]),
    value: row["absent"] ? "absent" as const : Number(row["raw_score"]),
    updatedAt: iso(row["updated_at"]),
    updatedBy: String(row["entered_by"] ?? "system"),
  };
}

async function findUser(sql: Sql, id: string): Promise<DbUser | null> {
  const rows = await sql`SELECT id, email, full_name, role, teacher_status, created_at FROM users WHERE id = ${id} LIMIT 1`;
  return (rows[0] as DbUser | undefined) ?? null;
}

async function currentUser(req: VercelRequest, sql: Sql): Promise<DbUser | null> {
  const id = getSessionId(req);
  return id ? findUser(sql, id) : null;
}

async function requireUser(req: VercelRequest, sql: Sql, roles?: User["role"][]): Promise<DbUser> {
  const user = await currentUser(req, sql);
  if (!user) fail(401, "UNAUTHENTICATED", "Please sign in.");
  const status = mapStatus(user.teacher_status, user.role);
  if (status === "pending") fail(403, "PENDING_APPROVAL", "Your account is waiting for Admin approval.");
  if (status === "disabled") fail(403, "FORBIDDEN", "Your account is disabled.");
  if (roles && !roles.includes(user.role as User["role"])) fail(403, "FORBIDDEN", "You do not have access to this.");
  return user;
}

async function audit(sql: Sql, user: DbUser, action: string, entity: string, entityId: string, message: string, oldValue?: string, newValue?: string) {
  const details = JSON.stringify({ entity, entityId, message, ...(oldValue === undefined ? {} : { oldValue }), ...(newValue === undefined ? {} : { newValue }) });
  await sql`INSERT INTO audit_logs (actor_id, actor_name, action, details) VALUES (${user.id}, ${user.full_name}, ${action}, ${details}::jsonb)`;
}

async function readSettings(sql: Sql): Promise<Settings> {
  await sql`INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
  const rows = await sql`SELECT * FROM settings WHERE id = 1`;
  const row = rows[0] as Record<string, any> | undefined;
  return {
    schoolName: String(row?.["school_name"] ?? "Kids Parliament Educational Centre"),
    motto: String(row?.["motto"] ?? "Knowledge Is Power"),
    gradeScale: DEFAULT_GRADE_SCALE,
    subjectPassMark: Number(row?.["pass_mark_subject"] ?? 50),
    totalPassMark: Number(row?.["pass_mark_total"] ?? 300),
    logoUrl: "/assets/logo.png",
    stampUrl: "/assets/stamp.png",
    signatureUrl: "/assets/signature.png",
    signatoryName: String(row?.["signatory_name"] ?? ""),
    signatoryPosition: String(row?.["signatory_title"] ?? ""),
    signupCode: String(row?.["signup_code"] ?? ""),
  };
}

async function findClass(sql: Sql, id: string): Promise<ClassRoom> {
  const rows = await sql`SELECT id, name, level FROM classes WHERE id = ${id} LIMIT 1`;
  if (!rows.length) fail(404, "NOT_FOUND", "Class not found.");
  return mapClass(rows[0] as Record<string, any>);
}

async function findPeriod(sql: Sql, id: string): Promise<ExamPeriod> {
  const rows = await sql`SELECT * FROM exam_periods WHERE id = ${id} LIMIT 1`;
  if (!rows.length) fail(404, "NOT_FOUND", "Exam period not found.");
  return mapPeriod(rows[0] as Record<string, any>);
}

async function findStudent(sql: Sql, id: string): Promise<Student> {
  const rows = await sql`SELECT * FROM students WHERE id = ${id} LIMIT 1`;
  if (!rows.length) fail(404, "NOT_FOUND", "Student not found.");
  return mapStudent(rows[0] as Record<string, any>);
}

async function ensureTeacherAssignment(sql: Sql, user: DbUser, classId: string, subjectId?: string) {
  if (user.role === "admin") return;
  if (!subjectId) fail(403, "FORBIDDEN", "You are not assigned to this subject and class.");
  const rows = await sql`SELECT id FROM teacher_assignments WHERE teacher_id = ${user.id} AND class_id = ${classId} AND subject_id = ${subjectId} LIMIT 1`;
  if (!rows.length) fail(403, "FORBIDDEN", "You are not assigned to this subject and class.");
}

function makeParentCode(): string {
  const bytes = randomBytes(6);
  return `KP-${Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("")}`;
}

function makeAdmissionNo(): string {
  const year = new Date().getFullYear();
  return `KP-${year}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function rateKey(req: VercelRequest, bucket: RateBucket, identity = ""): string {
  return createHash("sha256").update(`${bucket}:${clientIp(req)}:${identity.toLowerCase()}`).digest("hex");
}

async function assertNotRateLimited(sql: Sql, bucket: RateBucket, keyHash: string) {
  const rows = await sql`SELECT locked_until FROM api_rate_limits WHERE bucket = ${bucket} AND key_hash = ${keyHash} AND locked_until > NOW() LIMIT 1`;
  if (rows.length) fail(429, "RATE_LIMITED", "Too many attempts. Please try again later.");
}

async function recordFailure(sql: Sql, bucket: RateBucket, keyHash: string, maxAttempts: number, windowMinutes: number) {
  await sql`
    INSERT INTO api_rate_limits (bucket, key_hash, attempts, window_started_at, locked_until)
    VALUES (${bucket}, ${keyHash}, 1, NOW(), NULL)
    ON CONFLICT (bucket, key_hash) DO UPDATE SET
      attempts = CASE WHEN api_rate_limits.window_started_at < NOW() - (${windowMinutes} * INTERVAL '1 minute') THEN 1 ELSE api_rate_limits.attempts + 1 END,
      window_started_at = CASE WHEN api_rate_limits.window_started_at < NOW() - (${windowMinutes} * INTERVAL '1 minute') THEN NOW() ELSE api_rate_limits.window_started_at END,
      locked_until = CASE
        WHEN CASE WHEN api_rate_limits.window_started_at < NOW() - (${windowMinutes} * INTERVAL '1 minute') THEN 1 ELSE api_rate_limits.attempts + 1 END >= ${maxAttempts}
        THEN NOW() + (${windowMinutes} * INTERVAL '1 minute')
        ELSE NULL
      END
  `;
}

async function clearRateLimit(sql: Sql, bucket: RateBucket, keyHash: string) {
  await sql`DELETE FROM api_rate_limits WHERE bucket = ${bucket} AND key_hash = ${keyHash}`;
}

async function getClassInputs(sql: Sql, classId: string, periodId: string) {
  const [period, classroom] = await Promise.all([findPeriod(sql, periodId), findClass(sql, classId)]);
  const studentRows = await sql`SELECT * FROM students WHERE class_id = ${classId} AND status = 'active' ORDER BY full_name`;
  const students = (studentRows as Record<string, any>[]).map(mapStudent);
  const scoreRows = await sql`
    SELECT s.* FROM scores s
    JOIN students st ON st.id = s.student_id
    WHERE s.period_id = ${periodId} AND st.class_id = ${classId} AND st.status = 'active'
  `;
  const matrix = makeMatrix(students, scoreRows as Record<string, any>[]);
  const previousRows = await sql`SELECT * FROM exam_periods WHERE month < ${period.month} AND status <> 'draft' ORDER BY month DESC LIMIT 1`;
  let previousMatrix: ScoreMatrix | null = null;
  const previous = previousRows[0] as Record<string, any> | undefined;
  if (previous) {
    const previousScores = await sql`
      SELECT s.* FROM scores s
      JOIN students st ON st.id = s.student_id
      WHERE s.period_id = ${previous["id"]} AND st.class_id = ${classId} AND st.status = 'active'
    `;
    previousMatrix = makeMatrix(students, previousScores as Record<string, any>[]);
  }
  return { period, classroom, students, matrix, previousMatrix, settings: await readSettings(sql) };
}

function makeMatrix(students: Student[], scores: Record<string, any>[]): ScoreMatrix {
  const matrix: ScoreMatrix = Object.fromEntries(students.map((student) => [student.id, {}]));
  for (const row of scores) {
    const values = matrix[String(row["student_id"])];
    if (!values) continue;
    if (row["absent"]) values[String(row["subject_id"])] = "absent";
    else if (row["raw_score"] !== null && row["raw_score"] !== undefined) values[String(row["subject_id"])] = Number(row["raw_score"]);
  }
  return matrix;
}

async function createStudent(sql: Sql, input: NewStudent): Promise<Student> {
  await findClass(sql, input.classId);
  if (!input.fullName.trim()) fail(400, "VALIDATION", "Full name is required.");
  const gender = input.gender === "M" ? "Male" : "Female";
  const rows = await sql`
    INSERT INTO students (admission_no, full_name, gender, class_id, parent_code)
    VALUES (${makeAdmissionNo()}, ${input.fullName.trim()}, ${gender}, ${input.classId}, ${makeParentCode()})
    RETURNING *
  `;
  return mapStudent(rows[0] as Record<string, any>);
}

async function handle(req: VercelRequest, res: VercelResponse) {
  const sql = getSql();
  const method = req.method ?? "GET";
  const path = apiPath(req.url);
  const body = objectBody(req.body);
  const query = (key: string) => queryValue(req, key);

  if (method === "OPTIONS") return res.status(204).end();

  if (path === "/auth/signin" && method === "POST") {
    const email = requiredString(body["email"], "Email").toLowerCase();
    const password = requiredString(body["password"], "Password");
    const keyHash = rateKey(req, "signin", email);
    await assertNotRateLimited(sql, "signin", keyHash);
    const rows = await sql`SELECT id, email, full_name, role, teacher_status, created_at, password_hash FROM users WHERE lower(email) = ${email} LIMIT 1`;
    const row = rows[0] as (DbUser & { password_hash: string }) | undefined;
    const valid = row ? await bcrypt.compare(password, row.password_hash) : false;
    if (!row || !valid) {
      await recordFailure(sql, "signin", keyHash, 10, 10);
      fail(401, "UNAUTHENTICATED", "Incorrect email or password.");
    }
    const user = mapUser(row);
    if (user.status === "disabled") fail(403, "FORBIDDEN", "This account has been disabled. Contact the Admin.");
    await clearRateLimit(sql, "signin", keyHash);
    setSessionCookie(res, signToken({ id: user.id }));
    return res.json({ user });
  }

  if (path === "/auth/signup" && method === "POST") {
    const fullName = requiredString(body["fullName"], "Full name");
    const email = requiredString(body["email"], "Email").toLowerCase();
    const password = requiredString(body["password"], "Password");
    const signupCode = stringValue(body["signupCode"]);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "VALIDATION", "Enter a valid email address.");
    if (password.length < 6) fail(400, "VALIDATION", "Password must be at least 6 characters.");
    const settings = await readSettings(sql);
    if (settings.signupCode && signupCode !== settings.signupCode) fail(400, "VALIDATION", "The school sign-up code is not correct.");
    const passwordHash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO users (email, password_hash, full_name, role, teacher_status)
      VALUES (${email}, ${passwordHash}, ${fullName}, 'teacher', 'pending')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, full_name, role, teacher_status, created_at
    `;
    if (!rows.length) fail(409, "CONFLICT", "An account with this email already exists.");
    const row = rows[0] as DbUser;
    await audit(sql, row, "teacher.signup", "user", String(row.id), `${fullName} signed up`);
    const user = mapUser(row);
    setSessionCookie(res, signToken({ id: user.id }));
    return res.json({ user });
  }

  if (path === "/auth/signout" && method === "POST") {
    clearSessionCookie(res);
    return res.json({});
  }

  if (path === "/auth/me" && method === "GET") {
    const user = await currentUser(req, sql);
    return res.json(user ? mapUser(user) : null);
  }

  if (path === "/settings" && method === "GET") {
    const settings = await readSettings(sql);
    const settingsUser = await currentUser(req, sql);
    return res.json(settingsUser?.role === "admin" ? settings : { ...settings, signupCode: "" });
  }

  if (path === "/parent/lookup" && method === "POST") {
    const code = requiredString(body["code"], "Student code").toUpperCase();
    const keyHash = rateKey(req, "parent");
    await assertNotRateLimited(sql, "parent", keyHash);
    const rows = await sql`
      SELECT s.id, s.full_name, s.class_id, c.name AS class_name
      FROM students s JOIN classes c ON c.id = s.class_id
      WHERE upper(s.parent_code) = ${code} AND s.status <> 'withdrawn'
      LIMIT 1
    `;
    if (!rows.length) {
      await recordFailure(sql, "parent", keyHash, PARENT_MAX_ATTEMPTS, 5);
      fail(404, "NOT_FOUND", "We could not find a student with that code. Please check and try again.");
    }
    await clearRateLimit(sql, "parent", keyHash);
    const student = rows[0] as Record<string, any>;
    const periods = await sql`SELECT * FROM exam_periods WHERE status = 'published' ORDER BY month DESC`;
    return res.json({
      studentId: String(student["id"]),
      fullName: String(student["full_name"]),
      className: String(student["class_name"]),
      publishedPeriods: (periods as Record<string, any>[]).map(mapPeriod),
    });
  }

  if (path === "/parent/slip" && method === "POST") {
    const code = requiredString(body["code"], "Student code").toUpperCase();
    const periodId = requiredString(body["periodId"], "Exam period");
    const keyHash = rateKey(req, "parent");
    await assertNotRateLimited(sql, "parent", keyHash);
    const studentRows = await sql`SELECT * FROM students WHERE upper(parent_code) = ${code} AND status <> 'withdrawn' LIMIT 1`;
    if (!studentRows.length) {
      await recordFailure(sql, "parent", keyHash, PARENT_MAX_ATTEMPTS, 5);
      fail(404, "NOT_FOUND", "We could not find a student with that code.");
    }
    const student = mapStudent(studentRows[0] as Record<string, any>);
    const period = await findPeriod(sql, periodId);
    if (period.status !== "published") fail(403, "FORBIDDEN", "Results for this month are not yet published.");
    await clearRateLimit(sql, "parent", keyHash);
    const className = (await findClass(sql, student.classId)).name;
    const scoreRows = await sql`SELECT * FROM scores WHERE period_id = ${periodId} AND student_id = ${student.id}`;
    const matrix = makeMatrix([student], scoreRows as Record<string, any>[]);
    return res.json(buildSlip(student, className, period, matrix[student.id] ?? {}, await readSettings(sql)));
  }

  const user = await requireUser(req, sql);

  if (path === "/classes" && method === "GET") {
    const rows = await sql`SELECT id, name, level FROM classes ORDER BY level`;
    if (user.role === "teacher") {
      const assignments = await sql`SELECT DISTINCT class_id FROM teacher_assignments WHERE teacher_id = ${user.id}`;
      const allowed = new Set((assignments as Record<string, any>[]).map((row) => String(row["class_id"])));
      return res.json((rows as Record<string, any>[]).map(mapClass).filter((classroom) => allowed.has(classroom.id)));
    }
    return res.json((rows as Record<string, any>[]).map(mapClass));
  }

  if (path === "/classes" && method === "POST") {
    await requireUser(req, sql, ["admin"]);
    const name = requiredString(body["name"], "Class name");
    const level = Number(body["level"]);
    if (!Number.isInteger(level) || level < 1 || level > 20) fail(400, "VALIDATION", "Class level must be between 1 and 20.");
    const rows = await sql`INSERT INTO classes (name, level) VALUES (${name}, ${level}) RETURNING id, name, level`;
    const classroom = mapClass(rows[0] as Record<string, any>);
    await audit(sql, user, "class.create", "class", classroom.id, `Created ${name}`);
    return res.json(classroom);
  }

  const classMatch = /^\/classes\/([^/]+)(?:\/(promote))?$/.exec(path);
  if (classMatch && classMatch[2] === "promote" && method === "POST") {
    await requireUser(req, sql, ["admin"]);
    const classroom = await findClass(sql, decodeURIComponent(classMatch[1] ?? ""));
    const activeRows = await sql`SELECT id, full_name FROM students WHERE class_id = ${classroom.id} AND status = 'active'`;
    const nextRows = await sql`SELECT id, name FROM classes WHERE level = ${classroom.level + 1} LIMIT 1`;
    if (!nextRows.length) {
      await sql`UPDATE students SET status = 'graduated' WHERE class_id = ${classroom.id} AND status = 'active'`;
      await audit(sql, user, "class.promote", "class", classroom.id, `${activeRows.length} leavers from ${classroom.name} graduated`);
      return res.json({ moved: 0, graduated: activeRows.length });
    }
    const next = nextRows[0] as Record<string, any>;
    const occupied = await sql`SELECT COUNT(*)::int AS count FROM students WHERE class_id = ${next["id"]} AND status = 'active'`;
    if (Number((occupied[0] as Record<string, any>)["count"]) > 0) fail(409, "CONFLICT", `${next["name"]} still has students. Promote ${next["name"]} first.`);
    await sql`UPDATE students SET class_id = ${next["id"]} WHERE class_id = ${classroom.id} AND status = 'active'`;
    await audit(sql, user, "class.promote", "class", classroom.id, `${activeRows.length} students promoted`, classroom.name, String(next["name"]));
    return res.json({ moved: activeRows.length, graduated: 0 });
  }

  if (classMatch && !classMatch[2] && method === "PATCH") {
    await requireUser(req, sql, ["admin"]);
    const classroom = await findClass(sql, decodeURIComponent(classMatch[1] ?? ""));
    const name = requiredString(body["name"], "Class name");
    const rows = await sql`UPDATE classes SET name = ${name} WHERE id = ${classroom.id} RETURNING id, name, level`;
    await audit(sql, user, "class.rename", "class", classroom.id, "Renamed class", classroom.name, name);
    return res.json(mapClass(rows[0] as Record<string, any>));
  }

  if (path === "/students" && method === "GET") {
    const filter: StudentFilter = {
      classId: query("classId") || undefined,
      search: query("search") || undefined,
      includeInactive: query("includeInactive") === "true",
    };
    const rows = await sql`
      SELECT s.* FROM students s
      WHERE (${filter.classId ?? null}::uuid IS NULL OR s.class_id = ${filter.classId ?? null}::uuid)
        AND (${filter.search ?? null}::text IS NULL OR s.full_name ILIKE '%' || ${filter.search ?? ""} || '%' OR s.parent_code ILIKE '%' || ${filter.search ?? ""} || '%')
        AND (${filter.includeInactive ?? false} OR s.status = 'active')
        AND (${user.role === "admin"} OR s.class_id IN (SELECT class_id FROM teacher_assignments WHERE teacher_id = ${user.id}))
      ORDER BY s.full_name
    `;
    return res.json((rows as Record<string, any>[]).map(mapStudent));
  }

  if (path === "/students" && method === "POST") {
    await requireUser(req, sql, ["admin"]);
    const input: NewStudent = {
      fullName: requiredString(body["fullName"], "Full name"),
      gender: body["gender"] === "F" ? "F" : "M",
      classId: requiredString(body["classId"], "Class"),
    };
    const student = await createStudent(sql, input);
    await audit(sql, user, "student.create", "student", student.id, `Added ${student.fullName}`);
    return res.json(student);
  }

  if (path === "/students/bulk" && method === "POST") {
    await requireUser(req, sql, ["admin"]);
    const classId = requiredString(body["classId"], "Class");
    await findClass(sql, classId);
    if (!Array.isArray(body["rows"])) fail(400, "VALIDATION", "Student rows are required.");
    const created: Student[] = [];
    for (const raw of body["rows"]) {
      const row = objectBody(raw);
      created.push(await createStudent(sql, {
        fullName: requiredString(row["fullName"], "Student name"),
        gender: row["gender"] === "F" ? "F" : "M",
        classId,
      }));
    }
    await audit(sql, user, "student.bulk_create", "class", classId, `Added ${created.length} students`);
    return res.json(created);
  }

  if (path === "/students/move" && method === "POST") {
    await requireUser(req, sql, ["admin"]);
    const classId = requiredString(body["classId"], "Destination class");
    const ids = Array.isArray(body["ids"]) ? body["ids"].map((id) => String(id)) : [];
    if (!ids.length) fail(400, "VALIDATION", "Select at least one student.");
    const destination = await findClass(sql, classId);
    for (const id of ids) {
      const student = await findStudent(sql, id);
      await sql`UPDATE students SET class_id = ${classId} WHERE id = ${student.id}`;
      await audit(sql, user, "student.move", "student", student.id, `Moved ${student.fullName} to ${destination.name}`, student.classId, classId);
    }
    return res.status(204).end();
  }

  const studentMatch = /^\/students\/([^/]+)(?:\/(withdraw|regenerate-code))?$/.exec(path);
  if (studentMatch) {
    const studentId = decodeURIComponent(studentMatch[1] ?? "");
    const action = studentMatch[2];
    if (method === "GET" && !action) {
      await requireUser(req, sql, ["admin"]);
      return res.json(await findStudent(sql, studentId));
    }
    if (method === "PATCH" && !action) {
      await requireUser(req, sql, ["admin"]);
      const student = await findStudent(sql, studentId);
      const fullName = body["fullName"] === undefined ? student.fullName : requiredString(body["fullName"], "Full name");
      const gender: Gender = body["gender"] === undefined ? student.gender : body["gender"] === "F" ? "F" : "M";
      const rows = await sql`UPDATE students SET full_name = ${fullName}, gender = ${gender === "M" ? "Male" : "Female"} WHERE id = ${studentId} RETURNING *`;
      const updated = mapStudent(rows[0] as Record<string, any>);
      await audit(sql, user, "student.update", "student", studentId, `Edited ${updated.fullName}`, student.fullName, updated.fullName);
      return res.json(updated);
    }
    if (method === "POST" && action === "withdraw") {
      await requireUser(req, sql, ["admin"]);
      const student = await findStudent(sql, studentId);
      const rows = await sql`UPDATE students SET status = 'withdrawn' WHERE id = ${studentId} RETURNING *`;
      await audit(sql, user, "student.withdraw", "student", studentId, `Marked ${student.fullName} as withdrawn`);
      return res.json(mapStudent(rows[0] as Record<string, any>));
    }
    if (method === "POST" && action === "regenerate-code") {
      await requireUser(req, sql, ["admin"]);
      const student = await findStudent(sql, studentId);
      const rows = await sql`UPDATE students SET parent_code = ${makeParentCode()} WHERE id = ${studentId} RETURNING *`;
      const updated = mapStudent(rows[0] as Record<string, any>);
      await audit(sql, user, "student.code_regenerate", "student", studentId, `New parent code for ${student.fullName}`, student.parentCode, updated.parentCode);
      return res.json(updated);
    }
  }

  if (path === "/teachers" && method === "GET") {
    await requireUser(req, sql, ["admin"]);
    const rows = await sql`SELECT id, email, full_name, role, teacher_status, created_at FROM users WHERE role = 'teacher' ORDER BY full_name`;
    return res.json((rows as DbUser[]).map(mapUser));
  }

  const teacherMatch = /^\/teachers\/([^/]+)\/(approve|status|password|assignments)$/.exec(path);
  if (teacherMatch) {
    await requireUser(req, sql, ["admin"]);
    const teacherId = decodeURIComponent(teacherMatch[1] ?? "");
    const action = teacherMatch[2];
    if (action === "approve" && method === "POST") {
      const rows = await sql`UPDATE users SET teacher_status = 'approved' WHERE id = ${teacherId} AND role = 'teacher' RETURNING id, email, full_name, role, teacher_status, created_at`;
      if (!rows.length) fail(404, "NOT_FOUND", "Teacher not found.");
      await audit(sql, user, "teacher.approve", "user", teacherId, `Approved ${(rows[0] as Record<string, any>)["full_name"]}`);
      return res.json(mapUser(rows[0] as DbUser));
    }
    if (action === "status" && method === "POST") {
      const status = body["status"] as Exclude<UserStatus, "pending">;
      if (status !== "active" && status !== "disabled") fail(400, "VALIDATION", "Teacher status is invalid.");
      const rows = await sql`UPDATE users SET teacher_status = ${status === "active" ? "approved" : "disabled"} WHERE id = ${teacherId} AND role = 'teacher' RETURNING id, email, full_name, role, teacher_status, created_at`;
      if (!rows.length) fail(404, "NOT_FOUND", "Teacher not found.");
      const updated = mapUser(rows[0] as DbUser);
      await audit(sql, user, "teacher.status", "user", teacherId, `Updated ${updated.fullName} status`, undefined, status);
      return res.json(updated);
    }
    if (action === "password" && method === "POST") {
      const password = requiredString(body["password"], "Password");
      if (password.length < 6) fail(400, "VALIDATION", "Password must be at least 6 characters.");
      const rows = await sql`UPDATE users SET password_hash = ${await bcrypt.hash(password, 12)} WHERE id = ${teacherId} AND role = 'teacher' RETURNING id`;
      if (!rows.length) fail(404, "NOT_FOUND", "Teacher not found.");
      await audit(sql, user, "teacher.password", "user", teacherId, "Set a new teacher password");
      return res.status(204).end();
    }
    if (action === "assignments" && method === "PUT") {
      const teacher = await findUser(sql, teacherId);
      if (!teacher || teacher.role !== "teacher") fail(404, "NOT_FOUND", "Teacher not found.");
      if (!Array.isArray(body["items"])) fail(400, "VALIDATION", "Assignment items are required.");
      const items = body["items"].map((raw) => objectBody(raw)).map((item) => ({
        classId: requiredString(item["classId"], "Class"),
        subjectId: requiredString(item["subjectId"], "Subject"),
      }));
      const existing = await sql`SELECT id FROM teacher_assignments WHERE teacher_id = ${teacherId}`;
      await sql.transaction([
        sql`DELETE FROM teacher_assignments WHERE teacher_id = ${teacherId}`,
        ...items.map((item) => sql`INSERT INTO teacher_assignments (teacher_id, class_id, subject_id) VALUES (${teacherId}, ${item.classId}, ${item.subjectId})`),
      ]);
      const rows = await sql`SELECT * FROM teacher_assignments WHERE teacher_id = ${teacherId}`;
      await audit(sql, user, "assignment.set", "user", teacherId, `Set ${items.length} assignments (previously ${existing.length})`);
      return res.json((rows as Record<string, any>[]).map(mapAssignment));
    }
  }

  if (path === "/assignments" && method === "GET") {
    const teacherId = user.role === "teacher" ? user.id : query("teacherId");
    const rows = teacherId
      ? await sql`SELECT * FROM teacher_assignments WHERE teacher_id = ${teacherId}`
      : await sql`SELECT * FROM teacher_assignments`;
    return res.json((rows as Record<string, any>[]).map(mapAssignment));
  }

  if (path === "/exam-periods" && method === "GET") {
    const rows = await sql`SELECT * FROM exam_periods ORDER BY month DESC`;
    return res.json((rows as Record<string, any>[]).map(mapPeriod));
  }

  if (path === "/exam-periods" && method === "POST") {
    await requireUser(req, sql, ["admin"]);
    const name = requiredString(body["name"], "Exam period name");
    const month = requiredString(body["month"], "Month");
    if (!/^\d{4}-\d{2}$/.test(month) || Number(month.slice(5)) < 1 || Number(month.slice(5)) > 12) fail(400, "VALIDATION", "Choose a valid month.");
    const year = Number(month.slice(0, 4));
    const rows = await sql`
      INSERT INTO exam_periods (name, academic_year, term, month, status)
      VALUES (${name}, ${`${year}/${year + 1}`}, 'Monthly', ${month}, 'draft')
      ON CONFLICT (month) DO NOTHING
      RETURNING *
    `;
    if (!rows.length) fail(409, "CONFLICT", "There is already an exam period for that month.");
    const period = mapPeriod(rows[0] as Record<string, any>);
    await audit(sql, user, "period.create", "period", period.id, `Created ${period.name}`);
    return res.json(period);
  }

  const periodMatch = /^\/exam-periods\/([^/]+)\/(status|missing-scores)$/.exec(path);
  if (periodMatch) {
    const periodId = decodeURIComponent(periodMatch[1] ?? "");
    if (periodMatch[2] === "status" && method === "POST") {
      await requireUser(req, sql, ["admin"]);
      const period = await findPeriod(sql, periodId);
      const status = body["status"] as ExamPeriodStatus;
      if (!Object.hasOwn(STATUS_FLOW, status) || !STATUS_FLOW[period.status].includes(status)) fail(400, "VALIDATION", `Cannot change from ${period.status} to ${String(status)}.`);
      const rows = await sql`UPDATE exam_periods SET status = ${status} WHERE id = ${periodId} RETURNING *`;
      await audit(sql, user, "period.status", "period", periodId, period.name, period.status, status);
      return res.json(mapPeriod(rows[0] as Record<string, any>));
    }
    if (periodMatch[2] === "missing-scores" && method === "GET") {
      await requireUser(req, sql, ["admin"]);
      const rows = await sql`
        SELECT (SELECT COUNT(*) FROM students WHERE status = 'active') * ${SUBJECTS.length}
          - (SELECT COUNT(*) FROM scores s JOIN students st ON st.id = s.student_id WHERE s.period_id = ${periodId} AND st.status = 'active') AS missing
      `;
      return res.json(Number((rows[0] as Record<string, any>)["missing"]));
    }
  }

  if (path === "/scores" && method === "GET") {
    const periodId = requiredString(query("periodId"), "Exam period");
    const classId = requiredString(query("classId"), "Class");
    const subjectId = query("subjectId") || undefined;
    await ensureTeacherAssignment(sql, user, classId, subjectId);
    const rows = await sql`
      SELECT s.* FROM scores s
      JOIN students st ON st.id = s.student_id
      WHERE s.period_id = ${periodId} AND st.class_id = ${classId} AND st.status = 'active'
        AND (${subjectId ?? null}::text IS NULL OR s.subject_id = ${subjectId ?? null})
      ORDER BY st.full_name
    `;
    return res.json((rows as Record<string, any>[]).map(mapScore));
  }

  if (path === "/scores" && method === "PUT") {
    const input = body as unknown as SaveScoreInput;
    const periodId = requiredString(input.periodId, "Exam period");
    const studentId = requiredString(input.studentId, "Student");
    const subjectId = requiredString(input.subjectId, "Subject");
    const student = await findStudent(sql, studentId);
    const period = await findPeriod(sql, periodId);
    await ensureTeacherAssignment(sql, user, student.classId, subjectId);
    const value = input.value as ScoreValue;
    if (value !== null && value !== "absent" && (!Number.isInteger(value) || value < 0 || value > 100)) fail(400, "VALIDATION", "Score must be a whole number from 0 to 100.");
    if (user.role === "teacher" && period.status !== "open") fail(423, "LOCKED", "This exam period is closed for editing.");
    const previousRows = await sql`SELECT * FROM scores WHERE period_id = ${periodId} AND student_id = ${studentId} AND subject_id = ${subjectId} LIMIT 1`;
    const previous = previousRows[0] as Record<string, any> | undefined;
    const oldValue = previous ? previous["absent"] ? "absent" : String(previous["raw_score"]) : "empty";
    if (value === null) {
      await sql`DELETE FROM scores WHERE period_id = ${periodId} AND student_id = ${studentId} AND subject_id = ${subjectId}`;
      await audit(sql, user, "score.update", "score", `${periodId}|${studentId}|${subjectId}`, `${student.fullName} · ${subjectId} · ${period.name}`, oldValue, "empty");
      return res.status(204).end();
    }
    const rows = await sql`
      INSERT INTO scores (period_id, student_id, subject_id, raw_score, absent, entered_by)
      VALUES (${periodId}, ${studentId}, ${subjectId}, ${value === "absent" ? null : value}, ${value === "absent"}, ${user.id})
      ON CONFLICT (period_id, student_id, subject_id) DO UPDATE
        SET raw_score = EXCLUDED.raw_score, absent = EXCLUDED.absent, entered_by = EXCLUDED.entered_by, updated_at = NOW()
      RETURNING *
    `;
    await audit(sql, user, "score.update", "score", `${periodId}|${studentId}|${subjectId}`, `${student.fullName} · ${subjectId} · ${period.name}`, oldValue, String(value));
    return res.json(mapScore(rows[0] as Record<string, any>));
  }

  if (path === "/scores/progress" && method === "GET") {
    const periodId = requiredString(query("periodId"), "Exam period");
    const rows = await sql`
      SELECT c.id AS class_id, sub.subject_id,
        COUNT(DISTINCT st.id)::int AS total,
        COUNT(DISTINCT sc.id)::int AS entered
      FROM classes c
      CROSS JOIN unnest(${SUBJECTS.map((subject) => subject.id)}::text[]) AS sub(subject_id)
      LEFT JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.subject_id = sub.subject_id
      LEFT JOIN students st ON st.class_id = c.id AND st.status = 'active'
      LEFT JOIN scores sc ON sc.student_id = st.id AND sc.period_id = ${periodId} AND sc.subject_id = sub.subject_id
      WHERE (${user.role === "admin"} OR ta.teacher_id = ${user.id})
      GROUP BY c.id, sub.subject_id
      ORDER BY c.id, sub.subject_id
    `;
    return res.json((rows as Record<string, any>[]).map((row) => ({
      classId: String(row["class_id"]), subjectId: String(row["subject_id"]), total: Number(row["total"]), entered: Number(row["entered"]),
    })));
  }

  if (path === "/reports/subject" && method === "GET") {
    const periodId = requiredString(query("periodId"), "Exam period");
    const classId = requiredString(query("classId"), "Class");
    const subjectId = requiredString(query("subjectId"), "Subject");
    await ensureTeacherAssignment(sql, user, classId, subjectId);
    const input = await getClassInputs(sql, classId, periodId);
    return res.json(buildSubjectReport({
      subjectId, classId, className: input.classroom.name, period: input.period,
      students: input.students, matrix: input.matrix, previousMatrix: input.previousMatrix, settings: input.settings,
    }));
  }

  if (path === "/reports/class-analysis" && method === "GET") {
    await requireUser(req, sql, ["admin"]);
    const periodId = requiredString(query("periodId"), "Exam period");
    const classId = requiredString(query("classId"), "Class");
    const input = await getClassInputs(sql, classId, periodId);
    return res.json(buildClassAnalysis({
      classId, className: input.classroom.name, period: input.period,
      students: input.students, matrix: input.matrix, previousMatrix: input.previousMatrix, settings: input.settings,
    }));
  }

  if (path === "/slips/class" && method === "GET") {
    await requireUser(req, sql, ["admin"]);
    const periodId = requiredString(query("periodId"), "Exam period");
    const classId = requiredString(query("classId"), "Class");
    const input = await getClassInputs(sql, classId, periodId);
    return res.json(input.students.map((student) => buildSlip(
      student, input.classroom.name, input.period, input.matrix[student.id] ?? {}, input.settings,
    )));
  }

  if (path === "/slips/student" && method === "GET") {
    await requireUser(req, sql, ["admin"]);
    const periodId = requiredString(query("periodId"), "Exam period");
    const student = await findStudent(sql, requiredString(query("studentId"), "Student"));
    const period = await findPeriod(sql, periodId);
    const className = (await findClass(sql, student.classId)).name;
    const rows = await sql`SELECT * FROM scores WHERE period_id = ${periodId} AND student_id = ${student.id}`;
    const matrix = makeMatrix([student], rows as Record<string, any>[]);
    return res.json(buildSlip(student, className, period, matrix[student.id] ?? {}, await readSettings(sql)));
  }

  if (path === "/settings" && method === "PATCH") {
    await requireUser(req, sql, ["admin"]);
    const patch = body as Partial<Settings>;
    const current = await readSettings(sql);
    const next = { ...current, ...patch };
    await sql`
      UPDATE settings SET
        school_name = ${next.schoolName},
        motto = ${next.motto},
        signatory_name = ${next.signatoryName},
        signatory_title = ${next.signatoryPosition},
        signup_code = ${next.signupCode},
        pass_mark_subject = ${next.subjectPassMark},
        pass_mark_total = ${next.totalPassMark},
        updated_at = NOW()
      WHERE id = 1
    `;
    await audit(sql, user, "settings.update", "settings", "school", `Updated ${Object.keys(patch).join(", ")}`);
    return res.json(await readSettings(sql));
  }

  if (path === "/audit-log" && method === "GET") {
    await requireUser(req, sql, ["admin"]);
    const filter: AuditFilter = {
      action: query("action") || undefined,
      actorId: query("actorId") || undefined,
      from: query("from") || undefined,
      to: query("to") || undefined,
    };
    const rows = await sql`
      SELECT * FROM audit_logs
      WHERE (${filter.action ?? null}::text IS NULL OR action LIKE ${`${filter.action ?? ""}%`})
        AND (${filter.actorId ?? null}::uuid IS NULL OR actor_id = ${filter.actorId ?? null}::uuid)
        AND (${filter.from ?? null}::timestamptz IS NULL OR timestamp >= ${filter.from ?? null}::timestamptz)
        AND (${filter.to ?? null}::date IS NULL OR timestamp < (${filter.to ?? null}::date + INTERVAL '1 day'))
      ORDER BY timestamp DESC LIMIT 500
    `;
    return res.json((rows as Record<string, any>[]).map((row) => {
      const details = typeof row["details"] === "string" ? JSON.parse(row["details"]) as Record<string, unknown> : row["details"] as Record<string, unknown> | null;
      return {
      id: String(row["id"]), at: iso(row["timestamp"]), actorId: String(row["actor_id"] ?? ""), actorName: String(row["actor_name"]),
      action: String(row["action"]), entity: String(details?.["entity"] ?? ""), entityId: String(details?.["entityId"] ?? ""),
      details: String(details?.["message"] ?? JSON.stringify(details ?? {})),
      ...(details?.["oldValue"] ? { oldValue: String(details["oldValue"]) } : {}),
      ...(details?.["newValue"] ? { newValue: String(details["newValue"]) } : {}),
    };
    }));
  }

  return res.status(404).json({ code: "NOT_FOUND", message: `Route ${path} not found.` });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "OPTIONS") return res.status(204).end();
  try {
    return await handle(req, res);
  } catch (error) {
    if (error instanceof ApiFault) return res.status(error.status).json({ code: error.code, message: error.message });
    console.error("API error:", error);
    return res.status(500).json({ code: "SERVER", message: "Internal server error." });
  }
}
