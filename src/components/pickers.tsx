import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SUBJECTS } from "@/constants";
import type { ClassRoom, ExamPeriod } from "@/types";

interface Opt { value: string; label: string }
export function Picker({ label, value, onChange, options, placeholder }: { label: string; value: string | undefined; onChange: (v: string) => void; options: Opt[]; placeholder?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-44 sm:flex-none">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="bg-background"><SelectValue placeholder={placeholder ?? `Choose ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
export const periodOptions = (ps: ExamPeriod[] = []) => ps.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }));
export const classOptions = (cs: ClassRoom[] = []) => cs.map((c) => ({ value: c.id, label: c.name }));
export const subjectOptions = (ids?: string[]) => SUBJECTS.filter((s) => !ids || ids.includes(s.id)).map((s) => ({ value: s.id, label: s.name }));
