import { useNavigate, useSearch } from '@tanstack/react-router';
export interface Filters { classId?: string; periodId?: string; subjectId?: string; studentId?: string; search?: string; action?: string; actorId?: string; from?: string; to?: string }
export function validateFilters(raw: Record<string, unknown>): Filters {
  const result: Filters = {};
  for (const key of ['classId','periodId','subjectId','studentId','search','action','actorId','from','to'] as const) {
    const value = raw[key]; if (typeof value === 'string' && value) result[key] = value;
  }
  return result;
}
export function useFilters() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const filters = validateFilters(search);
  const set = (patch: Filters) => void navigate({
    to: '.',
    search: (prev) => validateFilters({ ...prev, ...patch }),
  });
  return { ...filters, set };
}
