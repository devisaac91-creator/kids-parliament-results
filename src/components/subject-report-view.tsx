import type { SubjectReport } from "@/types";
import { A4Page, AuthorisationBlock, DocHeader, examLine } from "./doc-page";

export function SubjectReportView({ r }: { r: SubjectReport }) {
  const max = Math.max(1, ...r.distribution);
  const stats: [string, string | number][] = [
    ["Students who wrote", r.sat], ["Pass", r.pass], ["Fail", r.fail], ["Pass %", `${r.passPct}%`],
    ["Average", r.average], ["Highest", r.high], ["Lowest", r.low],
    ["Change in average", r.changeInAverage === null ? "—" : r.changeInAverage > 0 ? `+${r.changeInAverage}` : r.changeInAverage],
  ];
  return (
    <A4Page>
      <DocHeader settings={r.settings} title={`SUBJECT REPORT: ${r.subjectName.toUpperCase()}`} line={examLine(r.className, r.period.name)} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded border border-primary/30 bg-row-alt px-2 py-2 text-center">
            <p className="text-lg font-extrabold text-primary">{v}</p>
            <p className="text-[10px] font-semibold text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      {r.absent > 0 && <p className="mt-1 text-[10px] text-muted-foreground">{r.absent} absent (not counted as “wrote”).</p>}
      <p className="mt-4 text-[11px] font-bold text-primary">Grade distribution</p>
      <div className="mt-2 flex h-36 items-end gap-1.5 border-b border-l border-border px-1">
        {r.distribution.map((n, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
            <span className="text-[10px] font-semibold">{n}</span>
            <div className={`w-full rounded-t ${i < 3 ? "bg-success" : i < 6 ? "bg-primary" : i < 8 ? "bg-warning" : "bg-destructive"}`} style={{ height: `${(n / max) * 100}px` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 px-1">{r.distribution.map((_, i) => <span key={i} className="flex-1 text-center text-[10px] font-bold">{i + 1}</span>)}</div>
      <p className="mt-4 text-[11px] font-bold text-destructive">Students below {r.settings.subjectPassMark} ({r.below50.length})</p>
      {r.below50.length ? (
        <table className="mt-1 w-full text-[11px]">
          <tbody>{r.below50.map((b, i) => <tr key={b.studentId} className={i % 2 ? "bg-row-alt" : ""}><td className="px-2 py-1">{b.fullName}</td><td className="px-2 py-1 text-right font-semibold">{b.value === "absent" ? "Absent" : b.value}</td></tr>)}</tbody>
        </table>
      ) : <p className="text-[11px] text-muted-foreground">Every student scored {r.settings.subjectPassMark} or more.</p>}
      <AuthorisationBlock settings={r.settings} certify={`I certify that this is a true summary of ${r.subjectName} results for ${r.className}, ${r.period.name}.`} />
    </A4Page>
  );
}
