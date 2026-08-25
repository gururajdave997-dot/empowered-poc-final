// EmpowerED-live/src/pages/Availability.tsx
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ResourceTable from "@/components/ResourceTable";
import { Card, CardContent } from "@/components/ui/card";
import { useResources } from "@/data/dataService";
import { isBench, isBuffer, isAvailable, isPartTime, totalFreeFte, dedupeByPerson } from "@/lib/availability";

export default function Availability() {
  const rows = useResources();

  const groups = useMemo(() => {
    // One line per person — the feed has one row per allocation, so without
    // this a person with two allocations is listed twice.
    const both = dedupeByPerson(rows.filter(isAvailable));
    const bench = dedupeByPerson(rows.filter(isBench));
    const buffer = dedupeByPerson(rows.filter(isBuffer));
    // Bench is a SUBSET of Buffer (see Dashboard), so this is a de-dup count,
    // never an addition. Stating it on the card stops it reading as 11 + 61.
    const benchInPool = both.filter(isBench).length;

    // count = allocation RECORDS, so the cards tie back to the Dashboard.
    // list  = unique people, so no name appears twice in the table.
    return [
      { key: "all", label: "Available (Bench + Buffer)", list: both, accent: "#0F6CBD",
        count: rows.filter(isAvailable).length, note: `${benchInPool} of these are on bench` },
      { key: "bench", label: "On Bench", list: bench, accent: "#E5484D",
        count: rows.filter(isBench).length, note: "included in Available" },
      { key: "buffer", label: "On Buffer", list: buffer, accent: "#F5A524",
        count: rows.filter(isBuffer).length, note: "included in Available" },
    ];
  }, [rows]);

  const [i, setI] = useState(0);
  const sel = groups[i];
  const fte = totalFreeFte(sel.list);
  const partTimers = sel.list.filter(isPartTime).length;
  const merged = sel.count - sel.list.length;

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
        {sel.list.length} people · capacity{" "}
        <span className="font-semibold text-slate-800">{fte.toFixed(2)} FTE</span>
        {partTimers > 0 && (
          <span className="text-slate-400"> · {partTimers} part-time (under 1.0 FTE)</span>
        )}
        {merged > 0 && (
          <span className="text-slate-400">
            {" "}· {sel.count} records → {sel.list.length} people ({merged} duplicate{merged > 1 ? "s" : ""} merged)
          </span>
        )}
      </div>

      <ResourceTable rows={sel.list} caption={sel.label} statusMode="capacity" />
    </div>
  );
}
