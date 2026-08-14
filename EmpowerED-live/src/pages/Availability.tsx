import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ResourceTable from "@/components/ResourceTable";
import { Card, CardContent } from "@/components/ui/card";
import { useResources } from "@/data/dataService";
import type { Resource } from "@/lib/types";

const isBench = (r: Resource) => {
  const bb = (r.billableBuffer || "").toLowerCase();
  const p = (r.currentProject || "").toLowerCase();
  const t = (r.department || "").toLowerCase();
  return bb.includes("bench") || p === "bench" || t.includes("resource pool");
};
const isBuffer = (r: Resource) => (r.billableBuffer || "").toLowerCase().includes("buffer");

export default function Availability() {
  const rows = useResources();

  const groups = useMemo(() => {
    const bench = rows.filter(isBench);
    const buffer = rows.filter(isBuffer);
    const both = rows.filter((r) => isBench(r) || isBuffer(r));
    return [
      { key: "all", label: "Available (Bench + Buffer)", list: both, accent: "#0F6CBD" },
      { key: "bench", label: "On Bench", list: bench, accent: "#E5484D" },
      { key: "buffer", label: "On Buffer", list: buffer, accent: "#F5A524" },
    ];
  }, [rows]);

  const [i, setI] = useState(0);
  const sel = groups[i];

  return (
    <div>
      <PageHeader title="Availability" subtitle="People who are on Bench or Buffer — names and details. Click a card to switch the list." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {groups.map((g, idx) => (
          <Card key={g.key} className={"relative overflow-hidden cursor-pointer hover:shadow-md " + (i === idx ? "ring-2 ring-brand" : "")} onClick={() => setI(idx)}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: g.accent }} />
            <CardContent className="pt-4">
              <div className="text-xs text-slate-500">{g.label}</div>
              <div className="text-2xl font-bold text-brand-dark">{g.list.length}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ResourceTable rows={sel.list} caption={sel.label} />
    </div>
  );
}
