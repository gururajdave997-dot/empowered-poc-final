import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ResourceTable from "@/components/ResourceTable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useResources } from "@/data/dataService";
import type { Resource } from "@/lib/types";

const isBench = (p: string) => (p || "").toLowerCase() === "bench";

export default function Projects() {
  const rows = useResources();
  const [proj, setProj] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const byProject = useMemo(
    () => group(rows.filter((r) => !isBench(r.currentProject)), (r) => r.currentProject),
    [rows]
  );
  const filtered = byProject.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()));
  const max = Math.max(1, ...byProject.map((d) => d.value));
  const overbooked = rows.filter((r) => r.allocationPct > 100);
  const list = proj ? rows.filter((r) => r.currentProject === proj) : null;

  return (
    <div>
      <PageHeader title="Project Allocation" subtitle="Staffing by project. Click a project to see its roster." />

      {overbooked.length > 0 && (
        <Card className="mb-4 border-red-200"><CardContent className="pt-4 flex items-center gap-2">
          <Badge tone="red">Overbooking</Badge>
          <span className="text-sm text-slate-600">{overbooked.length} resources allocated over 100%: {overbooked.slice(0, 4).map((r) => r.name).join(", ")}{overbooked.length > 4 ? "…" : ""}</span>
        </CardContent></Card>
      )}

      <Card className="mb-4"><CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-700">Resource Count by Project <span className="text-xs font-medium text-slate-400">({byProject.length} projects)</span></div>
          <Input placeholder="Search project…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        </div>
        <div className="max-h-[520px] overflow-y-auto pr-1">
          {filtered.map((d) => (
            <div key={d.name}
              onClick={() => setProj(d.name)}
              className={"flex items-center gap-3 my-1 text-xs cursor-pointer rounded-md px-1 py-0.5 hover:bg-slate-50 " + (proj === d.name ? "bg-brand-light/40" : "")}>
              <div className="w-72 shrink-0 text-slate-600 truncate" title={d.name}>{d.name}</div>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                <div style={{ width: `${Math.round(d.value / max * 100)}%`, background: "linear-gradient(90deg,#0F6CBD,#41A5EE)", height: "100%" }} />
              </div>
              <div className="w-8 text-right font-bold text-slate-700">{d.value}</div>
            </div>
          ))}
          {!filtered.length && <div className="text-xs text-slate-400 py-6 text-center">No matching projects.</div>}
        </div>
      </CardContent></Card>

      {list && <ResourceTable rows={list} caption={"Project roster — " + proj} onClear={() => setProj(null)} />}
    </div>
  );
}
function group(rows: Resource[], key: (r: Resource) => string) {
  const c: Record<string, number> = {};
  rows.forEach((r) => (c[key(r)] = (c[key(r)] || 0) + 1));
  return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
