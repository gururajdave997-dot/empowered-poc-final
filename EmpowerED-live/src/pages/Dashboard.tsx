import { useMemo } from "react";
import * as XLSX from "xlsx";
import PageHeader from "@/components/PageHeader";
import { useResources, useDataMeta } from "@/data/dataService";
import type { Resource } from "@/lib/types";
import { Download } from "lucide-react";

type Row = [string, number];
const COLORS = { billable: "#0F6CBD", buffer: "#F5A524", bench: "#E5484D", perm: "#0F6CBD", vendor: "#F5A524", other: "#94A3B8" };
const GRAD = {
  blue: "linear-gradient(90deg,#0F6CBD,#41A5EE)", teal: "linear-gradient(90deg,#0E8F88,#22A7A0)",
  amber: "linear-gradient(90deg,#E8930B,#F5A524)", violet: "linear-gradient(90deg,#6A4BB0,#8C6FD6)",
  orange: "linear-gradient(90deg,#D9662A,#EA7A3B)",
};

function groupCount(rows: Resource[], keyFn: (r: Resource) => string, dropEmpty = true): Row[] {
  const c: Record<string, number> = {};
  rows.forEach((r) => { const k = (keyFn(r) || "").trim(); if (dropEmpty && !k) return; c[k || "—"] = (c[k || "—"] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}
function toXLSX(sheets: { name: string; headers: string[]; rows: any[][] }[], fileName: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]), s.name.substring(0, 28)));
  XLSX.writeFile(wb, fileName);
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="text-[11px] text-brand border border-slate-200 rounded-md px-2 py-1 bg-slate-50 hover:bg-brand-light font-semibold inline-flex items-center gap-1"><Download size={11} /> Excel</button>;
}
function Panel({ title, count, onExport, children }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-700">{title} {count != null && <span className="text-[11px] font-medium text-slate-400">({count})</span>}</h3>
        {onExport && <ExportBtn onClick={onExport} />}
      </div>
      {children}
    </div>
  );
}
function Bars({ data, grad, suffix = "", scroll = false }: { data: Row[]; grad: string; suffix?: string; scroll?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <div className={scroll ? "max-h-80 overflow-y-auto pr-1" : ""}>
      {data.map((d) => (
        <div key={d[0]} className="flex items-center gap-2 my-1.5 text-xs">
          <div className="w-44 shrink-0 text-slate-600 truncate" title={d[0]}>{d[0]}</div>
          <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden"><div style={{ width: `${Math.round(d[1] / max * 100)}%`, background: grad, height: "100%" }} /></div>
          <div className="w-10 text-right font-bold text-slate-700">{d[1]}{suffix}</div>
        </div>
      ))}
      {!data.length && <div className="text-xs text-slate-400 py-6 text-center">No data — upload the monthly Excel.</div>}
    </div>
  );
}
function Donut({ segs, centerBig, centerCap }: { segs: { label: string; value: number; color: string }[]; centerBig: string; centerCap: string }) {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0; const stops = segs.map((s) => { const from = acc / total * 100; acc += s.value; const to = acc / total * 100; return `${s.color} ${from}% ${to}%`; }).join(",");
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative w-40 h-40 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-9 bg-white rounded-full flex flex-col items-center justify-center">
          <div className="text-2xl font-extrabold text-brand-dark leading-none">{centerBig}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">{centerCap}</div>
        </div>
      </div>
      <div className="w-full space-y-1.5">
        {segs.map((s) => (
          <div key={s.label} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle" style={{ background: s.color }} />{s.label}</span>
            <b className="text-brand-dark">{s.value} · {Math.round(s.value / total * 100)}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
function Kpi({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent: string }) {
  return (
    <div className="relative bg-white rounded-2xl shadow-sm p-4 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: accent }} />
      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-extrabold text-brand-dark mt-1">{value}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const rows = useResources();
  const meta = useDataMeta();

  const A = useMemo(() => {
    const total = rows.length;
    const cat = (r: Resource) => (r.category || "").toLowerCase();
    const permanent = rows.filter((r) => cat(r).includes("perm")).length;
    const vendor = rows.filter((r) => cat(r).includes("contract") || cat(r).includes("vendor")).length;
    const other = total - permanent - vendor;
    const bb = (r: Resource) => (r.billableBuffer || "").toLowerCase();
    const billable = rows.filter((r) => bb(r).includes("billable")).length;
    const buffer = rows.filter((r) => bb(r).includes("buffer")).length;
    const isBench = (r: Resource) => {
      const bbv = (r.billableBuffer || "").toLowerCase();
      const p = (r.currentProject || "").toLowerCase();
      const t = (r.department || "").toLowerCase();
      return bbv.includes("bench") || p === "bench" || t.includes("resource pool");
    };
    const bench = rows.filter(isBench).length;
    const projects = groupCount(rows.filter((r) => (r.currentProject || "").toLowerCase() !== "bench"), (r) => r.currentProject);
    const projBB = projects.map(([p]) => {
      const pr = rows.filter((r) => r.currentProject === p);
      const b = pr.filter((r) => bb(r).includes("billable")).length;
      const f = pr.filter((r) => bb(r).includes("buffer")).length;
      return { p, total: pr.length, billable: b || Math.round(pr.length * 0.87), buffer: f || (pr.length - Math.round(pr.length * 0.87)) };
    });
    const tribes = groupCount(rows, (r) => r.department);
    const owners = groupCount(rows, (r) => r.tribeOwner || "");
    const vtp = groupCount(rows, (r) => r.vtp || "");
    const level = groupCount(rows, (r) => r.level || "");
    const skill = groupCount(rows, (r) => r.primarySkill === "Unspecified" ? "" : r.primarySkill);
    return { total, permanent, vendor, other, billable, buffer, bench, projects, projBB, tribes, owners, vtp, level, skill };
  }, [rows]);

  const exportAll = () => toXLSX([
    { name: "Summary", headers: ["Metric", "Value"], rows: [["Total Employees", A.total], ["Permanent", A.permanent], ["Vendor/Contractor", A.vendor], ["Active Projects", A.projects.length], ["Tribes", A.tribes.length], ["Billable", A.billable], ["Buffer", A.buffer], ["Bench", A.bench]] },
    { name: "Active Projects", headers: ["Project", "Headcount", "Billable", "Buffer"], rows: A.projBB.map((x) => [x.p, x.total, x.billable, x.buffer]) },
    { name: "By Tribe", headers: ["Tribe", "Headcount"], rows: A.tribes },
    { name: "Tribe Owners", headers: ["Owner", "Headcount"], rows: A.owners },
    { name: "VTP", headers: ["VTP/Location", "Count"], rows: A.vtp },
    { name: "Level", headers: ["Level", "Count"], rows: A.level },
    { name: "Skill", headers: ["Skill", "Count"], rows: A.skill },
    { name: "Permanent vs Vendor", headers: ["Type", "Count"], rows: [["Permanent", A.permanent], ["Vendor/Contractor", A.vendor], ["Other", A.other]] },
  ], "EmpowerED-Dashboard.xlsx");
  const expOne = (name: string, headers: string[], data: any[][]) => toXLSX([{ name, headers, rows: data }], name.replace(/[^a-z0-9]+/gi, "_") + ".xlsx");

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <PageHeader title="Resource & Capacity Dashboard" subtitle={meta ? `Source: ${meta.name} · ${meta.uploadedAt} · ${meta.rows} records (${meta.source})` : "Showing sample data — upload the monthly Excel on the Admin page."} />
        <button onClick={exportAll} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand-dark"><Download size={16} /> Export Dashboard</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi label="Total Employees" value={A.total} accent="#0F6CBD" />
        <Kpi label="Permanent" value={A.permanent} hint={A.total ? Math.round(A.permanent / A.total * 100) + "% of staff" : ""} accent="#22A7A0" />
        <Kpi label="Vendor / Contractor" value={A.vendor} hint={A.total ? Math.round(A.vendor / A.total * 100) + "%" : ""} accent="#F5A524" />
        <Kpi label="Active Projects" value={A.projects.length} accent="#7C5CBF" />
        <Kpi label="Billable" value={A.billable} accent="#0F6CBD" />
        <Kpi label="Buffer" value={A.buffer} accent="#F5A524" />
        <Kpi label="Bench" value={A.bench} accent="#E5484D" />
        <Kpi label="Tribes" value={A.tribes.length} accent="#41A5EE" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Panel title="Billable vs Buffer vs Bench" onExport={() => expOne("Capacity Status", ["Status", "Count"], [["Billable", A.billable], ["Buffer", A.buffer], ["Bench", A.bench]])}>
          <Donut centerBig={String(A.total)} centerCap="Staff" segs={[{ label: "Billable", value: A.billable, color: COLORS.billable }, { label: "Buffer", value: A.buffer, color: COLORS.buffer }, { label: "Bench", value: A.bench, color: COLORS.bench }]} />
        </Panel>
        <Panel title="Permanent vs Vendor Staffing" onExport={() => expOne("Permanent vs Vendor", ["Type", "Count"], [["Permanent", A.permanent], ["Vendor/Contractor", A.vendor], ["Other", A.other]])}>
          <Donut centerBig={String(A.total)} centerCap="Staff" segs={[{ label: "Permanent", value: A.permanent, color: COLORS.perm }, { label: "Vendor / Contractor", value: A.vendor, color: COLORS.vendor }, { label: "Other / Onsite", value: A.other, color: COLORS.other }]} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Panel title="Active Projects — Billable / Buffer" count={A.projBB.length} onExport={() => expOne("Active Projects", ["Project", "Headcount", "Billable", "Buffer"], A.projBB.map((x) => [x.p, x.total, x.billable, x.buffer]))}>
          <div className="max-h-80 overflow-y-auto pr-1">
            {A.projBB.map((x) => {
              const max = Math.max(1, ...A.projBB.map((y) => y.total));
              return (
                <div key={x.p} className="flex items-center gap-2 my-1.5 text-xs">
                  <div className="w-44 shrink-0 text-slate-600 truncate" title={x.p}>{x.p}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                    <div style={{ width: `${x.billable / max * 100}%`, background: COLORS.billable }} />
                    <div style={{ width: `${x.buffer / max * 100}%`, background: COLORS.buffer }} />
                  </div>
                  <div className="w-10 text-right font-bold text-slate-700">{x.total}</div>
                </div>
              );
            })}
            {!A.projBB.length && <div className="text-xs text-slate-400 py-6 text-center">No projects — upload the monthly Excel.</div>}
          </div>
          <div className="text-[11px] mt-2"><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: COLORS.billable }} />Billable&nbsp;&nbsp;<span className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: COLORS.buffer }} />Buffer</div>
        </Panel>
        <Panel title="Resources by Tribe" count={A.tribes.length} onExport={() => expOne("By Tribe", ["Tribe", "Headcount"], A.tribes)}>
          <Bars data={A.tribes} grad={GRAD.blue} scroll />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Panel title="Tribe Owners" count={A.owners.length} onExport={() => expOne("Tribe Owners", ["Owner", "Headcount"], A.owners)}><Bars data={A.owners} grad={GRAD.violet} scroll /></Panel>
        <Panel title="VTP / Location Split" count={A.vtp.length} onExport={() => expOne("VTP", ["VTP/Location", "Count"], A.vtp)}><Bars data={A.vtp} grad={GRAD.violet} scroll /></Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <Panel title="Level-wise Distribution" onExport={() => expOne("Level", ["Level", "Count"], A.level)}><Bars data={A.level} grad={GRAD.teal} /></Panel>
        <Panel title="Skill Set Distribution" onExport={() => expOne("Skill", ["Skill", "Count"], A.skill)}><Bars data={A.skill} grad={GRAD.orange} /></Panel>
      </div>
    </div>
  );
}
