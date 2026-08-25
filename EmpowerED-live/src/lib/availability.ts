// EmpowerED-live/src/pages/Availability.tsx
//
// Self-contained: this page renders its own table instead of ResourceTable,
// so the Alloc % column is dropped HERE ONLY. ResourceTable.tsx is untouched
// and Resource Management keeps its Alloc % column exactly as it is.

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCSV } from "@/lib/utils";
import { useResources } from "@/data/dataService";
import {
  isBench, isBuffer, isAvailable, isPartTime, totalFreeFte, dedupeByPerson,
  capacityFte, capacityLabel, freePct, freeLabel, poolStatus, poolTone,
} from "@/lib/availability";
import { Download } from "lucide-react";

function statusTone(s: string): "green" | "amber" | "red" | "default" {
  if (s === "Available Now") return "green";
  if (s === "Allocated") return "red";
  return "amber";
}

export default function Availability() {
  const rows = useResources();

  const groups = useMemo(() => {
    // One line per person — the feed has one row per allocation, so without
    // this a person with two allocation records is listed twice.
    const both = dedupeByPerson(rows.filter(isAvailable));
    const bench = dedupeByPerson(rows.filter(isBench));
    const buffer = dedupeByPerson(rows.filter(isBuffer));

    const benchCount = rows.filter(isBench).length;
    const bufferCount = rows.filter(isBuffer).length;

    return [
      // Headline is the straight sum of the two cards beside it.
      // `records` keeps the true row count so the line underneath does not
      // mistake that sum for duplicates.
      { key: "all", label: "Available (Bench + Buffer)", list: both, accent: "#0F6CBD",
        count: benchCount + bufferCount, records: rows.filter(isAvailable).length,
        note: `${benchCount} bench + ${bufferCount} buffer` },
      { key: "bench", label: "On Bench", list: bench, accent: "#E5484D",
        count: benchCount, records: benchCount, note: "included in Available" },
      { key: "buffer", label: "On Buffer", list: buffer, accent: "#F5A524",
        count: bufferCount, records: bufferCount, note: "included in Available" },
    ];
  }, [rows]);

  const [i, setI] = useState(0);
  const [q, setQ] = useState("");
  const sel = groups[i];

  const filtered = sel.list.filter((r) =>
    !q || [r.name, r.employeeCode, r.businessUnit, r.department, r.primarySkill, r.secondarySkill]
      .join(" ").toLowerCase().includes(q.toLowerCase())
  );

  const fte = totalFreeFte(filtered);
  const partTimers = filtered.filter(isPartTime).length;
  const merged = sel.records - sel.list.length;

  const exportRows = filtered.map((r) => ({
    EmployeeCode: r.employeeCode, Name: r.name, BusinessUnit: r.businessUnit, Department: r.department,
    PrimarySkill: r.primarySkill, SecondarySkill: r.secondarySkill, Experience: r.experience,
    CurrentProject: r.currentProject,
    CapacityFte: capacityFte(r),
    FreePct: Math.round(freePct(r)),
    AllocationStatus: poolStatus(r),
    Availability: r.availabilityStatus,
  }));

  return (
    <div>
      <PageHeader
        title="Availability"
        subtitle="People who are on Bench or Buffer — names and details. Click a card to switch the list."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {groups.map((g, idx) => (
          <Card
            key={g.key}
            className={"relative overflow-hidden cursor-pointer hover:shadow-md " + (i === idx ? "ring-2 ring-brand" : "")}
            onClick={() => setI(idx)}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: g.accent }} />
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">{g.label}</div>
              <div className="text-2xl font-bold text-brand-dark">{g.count}</div>
              <div className="text-[11px] text-slate-400">{g.note}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-slate-600 mb-2">
        {filtered.length} people · capacity{" "}
        <span className="font-semibold text-slate-800">{fte.toFixed(2)} FTE</span>
        {partTimers > 0 && <span className="text-slate-400"> · {partTimers} part-time (under 1.0 FTE)</span>}
        {merged > 0 && (
          <span className="text-slate-400">
            {" "}· {sel.records} records → {sel.list.length} people ({merged} duplicate{merged > 1 ? "s" : ""} merged)
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-sm text-slate-600">
          {sel.label} <span className="text-slate-400">({filtered.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search name, BU, skill..." value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Button variant="outline" size="sm" onClick={() => downloadCSV("availability.csv", exportRows)}>
            <Download size={14} /> Export
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <Table>
          {/* No Alloc % column here — on this page every row is 0% by
              definition, because the allocation sits on a separate billable
              record. Resource Management still shows it. */}
          <THead><TR>
            <TH>Name</TH><TH>Business Unit</TH><TH>Dept</TH>
            <TH>Primary Skill</TH><TH>Secondary</TH><TH>Exp</TH><TH>Project</TH>
            <TH>Capacity (FTE)</TH><TH>Free %</TH><TH>Allocation Status</TH><TH>Availability</TH>
          </TR></THead>
          <tbody>
            {filtered.map((r) => (
              <TR key={r.employeeCode || r.name}>
                <TD className="font-medium text-slate-800">
                  {r.name}<div className="text-xs text-slate-400">{r.employeeCode}</div>
                </TD>
                <TD>{r.businessUnit}</TD><TD>{r.department}</TD>
                <TD>{r.primarySkill}</TD><TD className="text-slate-500">{r.secondarySkill}</TD>
                <TD>{r.experience}y</TD><TD>{r.currentProject}</TD>
                <TD className={isPartTime(r) ? "font-semibold text-violet-700" : "text-slate-500"}>
                  {capacityLabel(r)}
                </TD>
                <TD className={freePct(r) > 0 ? "font-medium text-emerald-700" : "text-slate-400"}>
                  {freeLabel(r)}
                </TD>
                <TD><Badge tone={poolTone(r)}>{poolStatus(r)}</Badge></TD>
                <TD><Badge tone={statusTone(r.availabilityStatus)}>{r.availabilityStatus}</Badge></TD>
              </TR>
            ))}
            {!filtered.length && (
              <TR><TD colSpan={11} className="text-center text-slate-400 py-6">No matching resources.</TD></TR>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
