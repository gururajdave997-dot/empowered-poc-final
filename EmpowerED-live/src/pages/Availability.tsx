// EmpowerED-live/src/pages/Availability.tsx
import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ResourceTable from "@/components/ResourceTable";
import { Card, CardContent } from "@/components/ui/card";
import { useResources } from "@/data/dataService";
import { bucketOf, isAvailable, totalFreeFte } from "@/lib/availability";

export default function Availability() {
  const rows = useResources();

  const groups = useMemo(() => {
    // One pass, one bucket per person — so the counts cannot overlap.
    const bench = rows.filter((r) => bucketOf(r) === "bench");
    const buffer = rows.filter((r) => bucketOf(r) === "buffer");
    const partial = rows.filter((r) => bucketOf(r) === "partial");
    const all = rows.filter(isAvailable);

    return [
      { key: "all", label: "Available (any free capacity)", list: all, accent: "#0F6CBD" },
      { key: "bench", label: "On Bench (0% allocated)", list: bench, accent: "#E5484D" },
      { key: "buffer", label: "On Buffer", list: buffer, accent: "#F5A524" },
      { key: "partial", label: "Partially Available", list: partial, accent: "#12A594" },
    ];
  }, [rows]);

  const [i, setI] = useState(0);
  const sel = groups[i];
  const freeFte = totalFreeFte(sel.list);

  return (
    <div>
      <PageHeader
        title="Availability"
        subtitle="Everyone with capacity to give — including people who are only part-allocated. Click a card to switch the list."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {groups.map((g, idx) => (
          <Card
            key={g.key}
            className={"relative overflow-hidden cursor-pointer hover:shadow-md " + (i === idx ? "ring-2 ring-brand" : "")}
            onClick={() => setI(idx)}
          >
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: g.accent }} />
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">{g.label}</div>
              <div className="text-2xl font-bold text-brand-dark">{g.list.length}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-slate-500 mb-2">
        Spare capacity in this list: <span className="font-semibold text-slate-700">{freeFte.toFixed(1)} FTE</span>
      </div>

      <ResourceTable rows={sel.list} caption={sel.label} />
    </div>
  );
}
