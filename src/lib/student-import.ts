import type { BulkStudentRow } from '@/api/types';
export interface ImportRow { fullName: string; gender: string; error: string; input: BulkStudentRow | null }
export function validateStudentImport(rows: Record<string, string>[], existing: string[]): ImportRow[] {
  const seen = new Set(existing.map((n) => n.trim().toLowerCase()));
  return rows.map((row) => {
    const fullName = (row['name'] ?? '').trim();
    const raw = (row['gender'] ?? '').trim().toUpperCase();
    const gender = raw === 'MALE' ? 'M' : raw === 'FEMALE' ? 'F' : raw;
    const duplicate = seen.has(fullName.toLowerCase());
    seen.add(fullName.toLowerCase());
    const error = !fullName ? 'Name is required' : gender !== 'M' && gender !== 'F' ? 'Gender must be M or F' : duplicate ? 'Duplicate name' : '';
    return { fullName, gender, error, input: !error && (gender === 'M' || gender === 'F') ? { fullName, gender } : null };
  });
}
