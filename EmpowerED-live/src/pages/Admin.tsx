import { useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { importWorkbook, useDataMeta, resetToMock } from "@/data/dataService";
import { useAuth } from "@/lib/auth";
import { supabaseEnabled } from "@/lib/supabase";
import { UploadCloud, RotateCcw } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const meta = useDataMeta();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      const m = await importWorkbook(f, user?.email || "");
      setMsg(m.source === "supabase"
        ? `Saved to the shared database — all viewers will now see this month's data (${m.loaded} records).`
        : `Loaded ${m.loaded} records locally. (Supabase not configured, so this is not shared with other users.)`);
    } catch (e: any) { setErr(e?.message || "Could not read the file."); }
    setBusy(false);
  };

  return (
    <div>
      <PageHeader title="Admin — Monthly Data Upload" subtitle="Upload the month's Excel. It is saved to the shared database so every viewer sees the latest data. Each upload replaces the previous month." />
      <Card className="max-w-2xl mb-4"><CardContent className="pt-4">
        <div className="text-sm font-semibold text-slate-700">Data for Dashboard (.xlsx)</div>
        <div className="text-xs text-slate-400 mb-3">
          Recognised columns: Emp ID, Name of Employee, 2026 Tribe, Team, Skill set, 2026 - Capacity,
          2026-Billable/Buffer, Total Exp, Level, Project code mapped, Excel Mail ID, Reports to, Category, Tribe Owner, VTP.
        </div>
        <div onClick={() => ref.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand hover:bg-brand-light/30">
          <UploadCloud className="mx-auto mb-1 text-brand" />
          <div className="text-sm text-slate-600">{busy ? "Reading & saving…" : "Click to upload .xlsx / .csv"}</div>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
        {msg && <div className="text-sm text-emerald-700 mt-2">{msg}</div>}
        {meta && (
          <div className="mt-3 text-xs text-slate-500">
            <Badge tone="green">Loaded</Badge> {meta.name} · {meta.uploadedAt} · {meta.rows} records · <b>{meta.source}</b>
          </div>
        )}
        {!supabaseEnabled && <div className="text-xs text-amber-600 mt-2">Note: Supabase is not configured, so uploads stay on this device only. Set VITE_SUPABASE_URL/KEY to share across users.</div>}
      </CardContent></Card>
      <Button variant="outline" size="sm" onClick={resetToMock}><RotateCcw size={14} /> Reset to sample data</Button>
    </div>
  );
}
