// Screens access the replaceable API only through these hooks.
import { useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '@/api';
import type { AuditFilter, StudentFilter } from '@/api/types';

export const useMe = () => useSuspenseQuery({ queryKey: ['me'], queryFn: () => api.auth.me(), staleTime: 60_000 });
export const useSettings = () => useSuspenseQuery({ queryKey: ['settings'], queryFn: () => api.settings.get(), staleTime: 60_000 });
export const useClasses = () => useSuspenseQuery({ queryKey: ['classes'], queryFn: () => api.classes.list() });
export const useStudents = (f: StudentFilter = {}) => useSuspenseQuery({ queryKey: ['students', f], queryFn: () => api.students.list(f) });
export const useTeachers = () => useSuspenseQuery({ queryKey: ['teachers'], queryFn: () => api.teachers.list() });
export const useAssignments = (teacherId?: string) => useSuspenseQuery({ queryKey: ['assignments', teacherId ?? 'all'], queryFn: () => api.assignments.list(teacherId ? { teacherId } : {}) });
export const usePeriods = () => useSuspenseQuery({ queryKey: ['periods'], queryFn: () => api.examPeriods.list() });
export const useProgress = (periodId?: string) => useSuspenseQuery({ queryKey: ['progress', periodId], queryFn: () => periodId ? api.scores.progress(periodId) : Promise.resolve([]) });
export const useScores = (periodId?: string, classId?: string, subjectId?: string) => useSuspenseQuery({ queryKey: ['scores', periodId, classId, subjectId ?? 'all'], queryFn: () => periodId && classId ? api.scores.list({ periodId, classId, subjectId }) : Promise.resolve([]) });
export const useSubjectReport = (periodId?: string, classId?: string, subjectId?: string) => useSuspenseQuery({ queryKey: ['report-subject', periodId, classId, subjectId], queryFn: () => periodId && classId && subjectId ? api.reports.subject({ periodId, classId, subjectId }) : Promise.resolve(null) });
export const useClassAnalysis = (periodId?: string, classId?: string) => useSuspenseQuery({ queryKey: ['report-class', periodId, classId], queryFn: () => periodId && classId ? api.reports.classAnalysis({ periodId, classId }) : Promise.resolve(null) });
export const useClassSlips = (periodId?: string, classId?: string) => useSuspenseQuery({ queryKey: ['slips', periodId, classId], queryFn: () => periodId && classId ? api.slips.forClass({ periodId, classId }) : Promise.resolve([]) });
export const useAuditLog = (f: AuditFilter) => useSuspenseQuery({ queryKey: ['audit', f], queryFn: () => api.auditLog.list(f) });
export const useParentSlip = (code: string, periodId: string) => useSuspenseQuery({ queryKey: ['parent-slip', code, periodId], queryFn: () => api.parentAccess.slip(code, periodId) });

export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, opts: { success?: string | ((r: TResult) => string); silent?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r) => {
      await qc.invalidateQueries();
      if (opts.success) toast.success(typeof opts.success === 'function' ? opts.success(r) : opts.success);
    },
    onError: (e) => { if (!opts.silent) toast.error(errorMessage(e)); },
  });
}
