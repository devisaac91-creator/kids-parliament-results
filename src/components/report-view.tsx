import { MAX_TOTAL } from "@/constants";
import type { ClassAnalysis, SubjectStrength } from "@/types";
import { A4Page, AuthorisationBlock, DocHeader, examLine } from "./doc-page";

const fmtChange = (c: number | null) => (c === null ? "—" : c > 0 ? `+${c}` : String(c));
const statusClass: Record<SubjectStrength, string> = { STRONG: "text-success", FAIR: "text-warning-foreground", WEAK: "text-destructive" };
const barClass: Record<SubjectStrength, string> = { STRONG: "bg-success", FAIR: "bg-warning", WEAK: "bg-destructive" };

export function ReportView({ data }: { data: ClassAnalysis }) {
  const s = data.settings;
  const cards = [
    ["Students who wrote", data.wrote],
    [`Class average total (/${MAX_TOTAL})`, data.averageTotal],
    ["Passed in total", data.passedTotal],
    ["Failed in total", data.failedTotal],
  ] as const;
  return (
    <A4Page>
      <DocHeader settings={s} title="SUBJECT PERFORMANCE ANALYSIS REPORT" line={examLine(data.className, data.period.name)} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded border border-primary/30 bg-row-alt px-2 py-2 text-center">
            <p className="text-xl font-extrabold text-primary">{v}</p>
            <p className="text-[10px] font-semibold text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[10px] sm:text-[11px]">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {["Subject", "Sat", "Pass", "Fail", "Pass %", "Avg", "High", "Low", "Change", "Status"].map((h) => <th key={h} className="px-1.5 py-1.5 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r.subjectId} className={i % 2 ? "bg-row-alt" : ""}>
                <td className="px-1.5 py-1 font-medium">{r.subjectName}</td>
                <td className="px-1.5 py-1">{r.sat}</td><td className="px-1.5 py-1">{r.pass}</td><td className="px-1.5 py-1">{r.fail}</td>
                <td className="px-1.5 py-1">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-12 overflow-hidden rounded bg-muted"><div className={`h-full ${barClass[r.status]}`} style={{ width: `${r.passPct}%` }} /></div>
                    <span>{r.passPct}%</span>
                  </div>
                </td>
                <td className="px-1.5 py-1">{r.average}</td><td className="px-1.5 py-1">{r.high}</td><td className="px-1.5 py-1">{r.low}</td>
                <td className="px-1.5 py-1">{fmtChange(r.change)}</td>
                <td className={`px-1.5 py-1 font-bold ${statusClass[r.status]}`}>{r.sat ? r.status : "—"}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-primary font-bold">
              <td className="px-1.5 py-1.5">TOTAL SCORE (/{MAX_TOTAL})</td>
              <td className="px-1.5 py-1.5">{data.wrote}</td><td className="px-1.5 py-1.5">{data.totalRow.pass}</td><td className="px-1.5 py-1.5">{data.totalRow.fail}</td>
              <td className="px-1.5 py-1.5">{data.totalRow.passPct}%</td><td className="px-1.5 py-1.5">{data.totalRow.average}</td>
              <td className="px-1.5 py-1.5">{data.totalRow.high}</td><td className="px-1.5 py-1.5">{data.totalRow.low}</td>
              <td className="px-1.5 py-1.5">{fmtChange(data.totalRow.change)}</td><td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded border-2 border-success/60 p-2">
          <p className="text-[11px] font-bold text-success">Strongest subjects</p>
          <ol className="mt-1 list-decimal pl-4 text-[11px]">{data.strongest.map((r) => <li key={r.subjectId}>{r.subjectName} — {r.passPct}% passed</li>)}</ol>
        </div>
        <div className="rounded border-2 border-destructive/60 p-2">
          <p className="text-[11px] font-bold text-destructive">Weakest subjects - priority for improvement</p>
          <ol className="mt-1 list-decimal pl-4 text-[11px]">{data.weakest.map((r) => <li key={r.subjectId}>{r.subjectName} — {r.passPct}% passed</li>)}</ol>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-bold text-primary">Observations and recommendations</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px]">{data.observations.map((o) => <li key={o}>{o}</li>)}</ul>
      </div>
      <AuthorisationBlock settings={s} certify={`I certify that this report is a true analysis of the ${data.className} examination results for ${data.period.name}.`} />
    </A4Page>
  );
}
