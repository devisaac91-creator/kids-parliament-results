// HTTP implementation stub. Each call maps to a REST endpoint under VITE_API_BASE_URL.
// Cookies carry the session (credentials: "include"). See docs/API_CONTRACT.md.
import { ApiError, type ApiErrorCode } from "@/api/errors";
import type { Api } from "@/api/types";
import type { User } from "@/types";

const BASE = (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { code?: ApiErrorCode; message?: string };
    throw new ApiError(data.code ?? "SERVER", data.message ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const httpApi: Api = {
  auth: {
    signIn: (email, password) => req("POST", "/auth/signin", { email, password }),
    signUp: (input) => req("POST", "/auth/signup", input),
    signOut: () => req("POST", "/auth/signout"),
    me: async () => {
      try {
        const res = await fetch(`${BASE}/auth/me`, {
          credentials: "include",
        });
        if (!res.ok) return null;
        return (await res.json()) as User | null;
      } catch {
        return null;
      }
    },
  },
  students: {
    list: (f = {}) => req("GET", `/students${qs({ ...f })}`),
    get: (id) => req("GET", `/students/${id}`),
    create: (input) => req("POST", "/students", input),
    bulkCreate: (classId, rows) => req("POST", "/students/bulk", { classId, rows }),
    update: (id, patch) => req("PATCH", `/students/${id}`, patch),
    move: (ids, classId) => req("POST", "/students/move", { ids, classId }),
    withdraw: (id) => req("POST", `/students/${id}/withdraw`),
  },
  classes: {
    list: () => req("GET", "/classes"),
    create: (name, level) => req("POST", "/classes", { name, level }),
    rename: (id, name) => req("PATCH", `/classes/${id}`, { name }),
    promote: (id) => req("POST", `/classes/${id}/promote`),
  },
  teachers: {
    list: () => req("GET", "/teachers"),
    approve: (id) => req("POST", `/teachers/${id}/approve`),
    setStatus: (id, status) => req("POST", `/teachers/${id}/status`, { status }),
    setPassword: (id, password) => req("POST", `/teachers/${id}/password`, { password }),
  },
  assignments: {
    list: (f = {}) => req("GET", `/assignments${qs({ ...f })}`),
    setForTeacher: (teacherId, items) => req("PUT", `/teachers/${teacherId}/assignments`, { items }),
  },
  examPeriods: {
    list: () => req("GET", "/exam-periods"),
    create: (input) => req("POST", "/exam-periods", input),
    setStatus: (id, status) => req("POST", `/exam-periods/${id}/status`, { status }),
    missingScores: (id) => req("GET", `/exam-periods/${id}/missing-scores`),
  },
  scores: {
    list: (q) => req("GET", `/scores${qs({ ...q })}`),
    save: (input) => req("PUT", "/scores", input),
    progress: (periodId) => req("GET", `/scores/progress${qs({ periodId })}`),
  },
  reports: {
    subject: (q) => req("GET", `/reports/subject${qs({ ...q })}`),
    classAnalysis: (q) => req("GET", `/reports/class-analysis${qs({ ...q })}`),
  },
  slips: {
    forStudent: (q) => req("GET", `/slips/student${qs({ ...q })}`),
    forClass: (q) => req("GET", `/slips/class${qs({ ...q })}`),
  },
  parentAccess: {
    lookup: (code) => req("POST", "/parent/lookup", { code }),
    slip: (code, periodId) => req("POST", "/parent/slip", { code, periodId }),
    regenerateCode: (studentId) => req("POST", `/students/${studentId}/regenerate-code`),
  },
  settings: {
    get: () => req("GET", "/settings"),
    update: (patch) => req("PATCH", "/settings", patch),
  },
  auditLog: {
    list: (f = {}) => req("GET", `/audit-log${qs({ ...f })}`),
  },
};
