// Lightweight CSV / Excel helpers. The Excel library loads only when used.
export type Cell = string | number;

function csvEscape(v: Cell) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadCsv(filename: string, rows: Cell[][]) {
  triggerDownload(new Blob(["\ufeff" + rows.map((r) => r.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }), filename);
}
export async function downloadXlsx(filename: string, rows: Cell[][], sheet = "Sheet1") {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheet.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Reads a CSV or Excel file into header-keyed rows (keys lower-cased). */
export async function readSpreadsheet(file: File): Promise<Record<string, string>[]> {
  let grid: string[][];
  if (/\.csv$/i.test(file.name)) grid = parseCsv((await file.text()).replace(/^\ufeff/, ""));
  else {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const first = wb.SheetNames[0];
    const ws = first ? wb.Sheets[first] : undefined;
    grid = ws ? (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: false })) : [];
  }
  const [head, ...body] = grid;
  if (!head) return [];
  const keys = head.map((h) => String(h).trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, String(r[i] ?? "").trim()])));
}

/** Opens the print dialog (users choose "Save as PDF" to download). */
export function printPage(title?: string) {
  const old = document.title;
  if (title) document.title = title;
  window.print();
  setTimeout(() => (document.title = old), 500);
}
