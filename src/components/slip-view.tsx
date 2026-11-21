import { Check } from "lucide-react";
import { MAX_TOTAL } from "@/constants";
import type { StudentSlip } from "@/types";
import { A4Page, AuthorisationBlock, DocHeader, examLine } from "./doc-page";

export function SlipView({ slip }: { slip: StudentSlip }) {
  const { settings: s } = slip;
  return (
    <A4Page>
      <DocHeader settings={s} title="STUDENT RESULT SLIP" line={examLine(slip.className, slip.period.name)} />
      <div className="mt-3 flex flex-wrap justify-between gap-2 rounded bg-row-alt px-3 py-2 text-xs sm:text-sm">
        <p><span className="font-semibold text-muted-foreground">NAME: </span><span className="font-bold uppercase">{slip.student.fullName}</span></p>
        <p><span className="font-semibold text-muted-foreground">GENDER: </span><span className="font-bold">{slip.student.gender === "M" ? "Male" : "Female"}</span></p>
      </div>
      <table className="mt-3 w-full border-collapse text-[11px] sm:text-xs">
        <thead>
          <tr className="bg-primary text-left text-primary-foreground">
            <th className="px-2 py-1.5">Subject</th><th className="px-2 py-1.5 text-center">Score</th><th className="px-2 py-1.5 text-center">Grade</th>
            <th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5 text-center">Counted</th>
          </tr>
        </thead>
        <tbody>
          {slip.rows.map((r, i) => (
            <tr key={r.subjectId} className={i % 2 ? "bg-row-alt" : ""}>
              <td className="px-2 py-1.5 font-medium">{r.subjectName}{r.core && <span className="ml-1 text-[9px] font-bold text-primary">CORE</span>}</td>
              <td className="px-2 py-1.5 text-center font-semibold">{r.value === null ? "—" : r.value === "absent" ? "ABS" : r.value}</td>
              <td className="px-2 py-1.5 text-center font-semibold">{r.grade ?? "—"}</td>
              <td className="px-2 py-1.5">{r.description}</td>
              <td className="px-2 py-1.5 text-center">{r.counted && <Check className="mx-auto h-4 w-4 text-primary" aria-label="Counted" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded border-2 border-primary px-3 py-2">
          <p className="text-[10px] font-bold text-muted-foreground">TOTAL SCORE (out of {MAX_TOTAL})</p>
          <p className="text-2xl font-extrabold text-primary">{slip.total}</p>
        </div>
        <div className={`rounded border-2 px-3 py-2 ${slip.passed ? "border-success" : "border-destructive"}`}>
          <p className="text-[10px] font-bold text-muted-foreground">RESULT (pass mark {s.totalPassMark})</p>
          <p className={`text-2xl font-extrabold ${slip.passed ? "text-success" : "text-destructive"}`}>{slip.passed ? "PASS" : "FAIL"}</p>
        </div>
      </div>
      {!slip.complete && <p className="mt-2 text-[10px] text-warning-foreground print:hidden">Some scores are not entered yet.</p>}
      <div className="mt-3">
        <p className="text-[10px] font-bold text-muted-foreground">GRADE SCALE</p>
        <div className="mt-1 grid grid-cols-3 gap-x-3 gap-y-0.5 text-[10px] sm:grid-cols-5">
          {s.gradeScale.map((g) => <span key={g.grade}><b>{g.grade}</b> {g.min}–{g.max} {g.description}</span>)}
        </div>
      </div>
      <p className="mt-2 text-[10px] italic text-muted-foreground">Note: Pass mark is {s.subjectPassMark}%. Total score is the 4 core subjects plus the best 2 other subjects (out of {MAX_TOTAL}).</p>
      <AuthorisationBlock settings={s} certify={`I certify that the above is a true record of the examination results of this student for ${slip.period.name}.`} />
    </A4Page>
  );
}
