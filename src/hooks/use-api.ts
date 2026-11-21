// All screen data access goes through these hooks, which call `api`.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage } from "@/api";
import type { AuditFilter, StudentFilter } from "@/api/types";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api.auth.me(), staleTime: 60_000 });
export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: () => api.settings.get(), staleTime: 60_000 });
export const useClasses = () => useQuery({ queryKey: ["classes"], queryFn: () => api.classes.list() });
export const useStudents = (f: StudentFilter = {}) => useQuery({ queryKey: ["students", f], queryFn: () => api.students.list(f) });
export const useTeachers = () => useQuery({ queryKey: ["teachers"], queryFn: () => api.teachers.list() });
export const useAssignments = (teacherId?: string) => useQuery({ queryKey: ["assignments", teacherId ?? "all"], queryFn: () => api.assignments.list(teacherId ? { teacherId } : {}) });
export const usePeriods = () => useQuery({ queryKey: ["periods"], queryFn: () => api.examPeriods.list() });
export const useProgress = (periodId?: string) => useQuery({ queryKey: ["progress", periodId], queryFn: () => api.scores.progress(periodId!), enabled: !!periodId });
export const useScores = (periodId?: string, classId?: string, subjectId?: string) =>
  useQuery({ queryKey: ["scores", periodId, classId, subjectId ?? "all"], queryFn: () => api.scores.list({ periodId: periodId!, classId: classId!, subjectId }), enabled: !!periodId && !!classId });
export const useSubjectReport = (periodId?: string, classId?: string, subjectId?: string) =>
  useQuery({ queryKey: ["report-subject", periodId, classId, subjectId], queryFn: () => api.reports.subject({ periodId: periodId!, classId: classId!, subjectId: subjectId! }), enabled: !!periodId && !!classId && !!subjectId });
export const useClassAnalysis = (periodId?: string, classId?: string) =>
  useQuery({ queryKey: ["report-class", periodId, classId], queryFn: () => api.reports.classAnalysis({ periodId: periodId!, classId: classId! }), enabled: !!periodId && !!classId });
export const useClassSlips = (periodId?: string, classId?: string) =>
  useQuery({ queryKey: ["slips", periodId, classId], queryFn: () => api.slips.forClass({ periodId: periodId!, classId: classId! }), enabled: !!periodId && !!classId });
export const useAuditLog = (f: AuditFilter) => useQuery({ queryKey: ["audit", f], queryFn: () => api.auditLog.list(f) });

/** Generic mutation that refreshes every cached query on success (fine for this app's size). */
export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, opts: { success?: string | ((r: TResult) => string); silent?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      void qc.invalidateQueries();
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(r) : opts.success);
    },
    onError: (e) => { if (!opts.silent) toast.error(errorMessage(e)); },
  });
}
