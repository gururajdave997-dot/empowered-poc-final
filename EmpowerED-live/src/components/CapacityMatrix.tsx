import { useMemo, Fragment } from "react";
import * as XLSX from "xlsx";
import type { Resource } from "@/lib/types";
import { Download } from "lucide-react";

const PREFERRED = ["Dev", "SQE", "DB", "DevOps", "Perf Eng", "PMO", "Dev-Onsite", "Managers"];
const cap = (r: Resource) => { const c = Number(r.capacity) || 0; return c > 0 ? c : 1; }; // FTE if present, else headcount (1)
const bb = (r: Resource) => (r.billableBuffer || "").toLowerCase();
const isBench = (r: Resource) => bb(r).includes("bench") || (r.currentProject || "").toLowerCase() === "bench" || (r.department || "").toLowerCase().includes("resource pool");
const r2 = (x: number) => Math.round(x * 100) / 100;

function discipline(team: string): string {
  const t = (team || "").toLowerCase();
  if (!t) return "Unassigned";
  if (t.includes("onsite")) return "Dev-Onsite";
  if (t.includes("develop") || t === "dev") return "Dev";
  if (t.includes("sqe") || t.includes("qa") || t.includes("test")) return "SQE";
  if (t.includes("devops")) return "DevOps";
  if (t.includes("perf")) return "Perf Eng";
  if (t.includes("pmo")) return "PMO";
  if (t === "db" || t.includes("dba") || t.includes("database")) return "DB";
  if (t.includes("manager")) return "Managers";
  return team;
}

export default function CapacityMatrix({ rows }: { rows: Resource[] }) {
  const M = useMemo(() => {
    const disc = (r: Resource) => discipline(r.businessUnit || "");
    // ordered discipline columns
    const present = Array.from(new Set(rows.map(disc))).filter(Boolean);
    const disciplines = [
      ...PREFERRED.filter((d) => present.includes(d)),
      ...present.filter((d) => !PREFERRED.includes(d)).sort(),
    ];
    const sumCap = (rs: Resource[]) => r2(rs.reduce((s, r) => s + cap(r), 0));
    const colFor = (d: string) => rows.filter((r) => disc(r) === d);

    const summary = {
      total: { all: sumCap(rows), byD: disciplines.map((d) => sumCap(colFor(d))) },
      billable: { all: sumCap(rows.filter((r) => bb(r).includes("billable"))), byD: disciplines.map((d) => sumCap(colFor(d).filter((r) => bb(r).includes("billable")))) },
      buffer: { all: sumCap(rows.filter((r) => bb(r).includes("buffer"))), byD: disciplines.map((d) => sumCap(colFor(d).filter((r) => bb(r).includes("buffer")))) },
      bench: { all: rows.filter(isBench).length, byD: disciplines.map((d) => colFor(d).filter(isBench).length) },
    };
    const pct = (a: number, b: number) => (b ? Math.round(a / b * 1000) / 10 + "%" : "0%");

    // tribe x discipline (capacity total, and buffer)
    const tribes = Array.from(new Set(rows.map((r) => r.department || "Unassigned")))
      .map((name) => ({ name, cap: sumCap(rows.filter((r) => (r.department || "Unassigned") === name)) }))
      .sort((a, b) => b.cap - a.cap);
    const tribeRows = tribes.map((t) => {
      const tr = rows.filter((r) => (r.department || "Unassigned") === t.name);
      return {
        name: t.name, total: sumCap(tr),
        cells: disciplines.map((d) => {
          const cell = tr.filter((r) => disc(r) === d);
          return { cap: sumCap(cell), buffer: sumCap(cell.filter((r) => bb(r).includes("buffer"))) };
        }),
      };
    });
    return { disciplines, summary, pct, tribeRows };
  }, [rows]);

  const exportMatrix = () => {
    const wb = XLSX.utils.book_new();
    const sHead = ["Metric", "Total", ...M.disciplines];
    const sRows = [
      ["Total Headcount", M.summary.total.all, ...M.summary.total.byD],
      ["Billable", M.summary.billable.all, ...M.summary.billable.byD],
      ["Buffer", M.summary.buffer.all, ...M.summary.buffer.byD],
      ["Buffer %", M.pct(M.summary.buffer.all, M.summary.total.all), ...M.disciplines.map((_, i) => M.pct(M.summary.buffer.byD[i], M.summary.total.byD[i]))],
      ["Bench", M.summary.bench.all, ...M.summary.bench.byD],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([sHead, ...sRows]), "Capacity Summary");
    const tHead = ["Tribe", "Total", ...M.disciplines.flatMap((d) => [d, d + "-Buffer"])];
    const tRows = M.tribeRows.map((t) => [t.name, t.total, ...t.cells.flatMap((c) => [c.cap, c.buffer])]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([tHead, ...tRows]), "Tribe x Discipline");
    XLSX.writeFile(wb, "Capacity-Matrix.xlsx");
  };

  const th = "px-2 py-1.5 text-right font-semibold whitespace-nowrap";
  const thl = "px-2 py-1.5 text-left font-semibold whitespace-nowrap";
  const td = "px-2 py-1 text-right whitespace-nowrap";
  const tdl = "px-2 py-1 text-left whitespace-nowrap font-medium";

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-700">Capacity Matrix by Discipline (FTE)</h3>
        <button onClick={exportMatrix} className="text-[11px] text-brand border border-slate-200 rounded-md px-2 py-1 bg-slate-50 hover:bg-brand-light font-semibold inline-flex items-center gap-1"><Download size={11} /> Excel</button>
      </div>

      <div className="overflow-x-auto mb-5">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="bg-brand-dark text-white">
              <th className={thl}>Metric</th><th className={th}>Total</th>
              {M.disciplines.map((d) => <th key={d} className={th}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { k: "Total Headcount", all: M.summary.total.all, byD: M.summary.total.byD },
              { k: "Billable", all: M.summary.billable.all, byD: M.summary.billable.byD },
              { k: "Buffer", all: M.summary.buffer.all, byD: M.summary.buffer.byD },
              { k: "Buffer %", all: M.pct(M.summary.buffer.all, M.summary.total.all), byD: M.disciplines.map((_, i) => M.pct(M.summary.buffer.byD[i], M.summary.total.byD[i])) },
              { k: "Bench", all: M.summary.bench.all, byD: M.summary.bench.byD },
            ].map((row, ri) => (
              <tr key={row.k} className={ri % 2 ? "bg-slate-50" : ""}>
                <td className={tdl}>{row.k}</td><td className={td + " font-bold text-brand-dark"}>{row.all}</td>
                {row.byD.map((v, i) => <td key={i} className={td}>{v as any}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs font-semibold text-slate-600 mb-2">Capacity by Tribe × Discipline (FTE · buffer shown in the –Buf column)</div>
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="text-xs border-collapse">
          <thead className="sticky top-0">
            <tr className="bg-brand-dark text-white">
              <th className={thl}>Tribe</th><th className={th}>Total</th>
              {M.disciplines.map((d) => (
                <Fragment key={d}>
                  <th className={th}>{d}</th>
                  <th className={th + " text-amber-200"}>{d}-Buf</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {M.tribeRows.map((t, ri) => (
              <tr key={t.name} className={ri % 2 ? "bg-slate-50" : ""}>
                <td className={tdl}>{t.name}</td><td className={td + " font-bold text-brand-dark"}>{t.total}</td>
                {t.cells.map((c, i) => (
                  <Fragment key={i}>
                    <td className={td}>{c.cap || ""}</td>
                    <td className={td + " text-amber-600"}>{c.buffer || ""}</td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
