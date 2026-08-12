import { useSyncExternalStore } from "react";
import * as XLSX from "xlsx";
import type { Resource, AvailabilityStatus } from "@/lib/types";
import { generateResources } from "./mockData";
import { supabase, supabaseEnabled } from "@/lib/supabase";

interface DataMeta { name: string; uploadedAt: string; rows: number; loaded: number; source: "supabase" | "local" | "sample"; }

let resources: Resource[] = generateResources();
let meta: DataMeta | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

export function useResources(): Resource[] {
  return useSyncExternalStore(subscribe, () => resources, () => resources);
}
export function useDataMeta(): DataMeta | null {
  return useSyncExternalStore(subscribe, () => meta, () => meta);
}
export function getResources() { return resources; }

// ---- header handling ----
const norm = (h: string) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADER_MAP: Record<string, string> = {
  empid: "employeeCode", employeecode: "employeeCode", perootid: "perootId", fusionid: "fusionId",
  nameofemployee: "name", employeename: "name", name: "name",
  reportsto: "managerName", pearsonfuncmgr: "managerAlt",
  team: "team", squad: "squad", "2026tribe": "tribe", tribe: "tribe",
  "2026capacity": "capacity", "2026billablebuffer": "billableBuffer",
  level: "level", category: "category",
  pearsonmailid: "pearsonEmail", excelmailid: "email",
  wfhwfo: "workLocation", projectcodemapped: "currentProject",
  tribeowner: "tribeOwner", vtp: "vtp", skillset: "primarySkill",
};
function canonical(key: string): string {
  if (HEADER_MAP[key]) return HEADER_MAP[key];
  if (key.startsWith("totalexp")) return "experience";
  return key;
}
const clean = (v: any) => (v === null || v === undefined || String(v).trim().toLowerCase() === "none") ? "" : String(v).trim();
function levelToProficiency(level: string): number {
  const m = String(level).match(/(\d)/); return m ? Math.max(1, Math.min(5, Number(m[1]))) : 3;
}
function allocFromCapacity(capacity: string, bb: string): number {
  if (/buffer/i.test(bb)) return 0;
  const n = Number(capacity); if (isNaN(n)) return 0;
  return Math.round(n <= 1 ? n * 100 : n);
}
const availFromAlloc = (pct: number): AvailabilityStatus => pct <= 0 ? "Available Now" : "Allocated";

function parseWorkbook(buf: ArrayBuffer): Resource[] {
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  const out: Resource[] = [];
  raw.forEach((row, i) => {
    const o: Record<string, any> = {};
    Object.keys(row).forEach((k) => { o[canonical(norm(k))] = row[k]; });
    const code = clean(o.employeeCode) || clean(o.perootId) || clean(o.fusionId);
    const name = clean(o.name), tribe = clean(o.tribe), team = clean(o.team);
    const project = clean(o.currentProject), skill = clean(o.primarySkill);
    if (!(code || name || tribe || team || project || skill)) return;
    const cap = Number(clean(o.capacity)) || 0;
    const pct = allocFromCapacity(clean(o.capacity), clean(o.billableBuffer));
    out.push({
      employeeCode: code || `ROW${i + 2}`,
      name: name || "(Unnamed)",
      department: tribe || team || "Unassigned",
      businessUnit: team || clean(o.squad) || "",
      experience: Number(clean(o.experience)) || 0,
      primarySkill: skill || "Unspecified",
      secondarySkill: "",
      certifications: [],
      proficiency: levelToProficiency(clean(o.level)),
      email: clean(o.email) || clean(o.pearsonEmail),
      managerName: clean(o.managerName) || clean(o.managerAlt),
      category: clean(o.category),
      tribeOwner: clean(o.tribeOwner),
      vtp: clean(o.vtp),
      level: clean(o.level),
      billableBuffer: clean(o.billableBuffer),
      capacity: cap,
      skillStatus: clean(o.category),
      currentProject: project || "Bench",
      allocationPct: pct,
      timesheetHours: Math.round((pct / 100) * 40),
      availableDate: "",
      availabilityStatus: availFromAlloc(pct),
    } as Resource);
  });
  return out;
}

// Admin upload: parse, save a shared snapshot to Supabase, refresh state.
export async function importWorkbook(file: File, uploadedBy = ""): Promise<DataMeta> {
  const buf = await file.arrayBuffer();
  const rows = parseWorkbook(buf);
  if (rows.length) resources = rows;
  let source: DataMeta["source"] = "local";
  if (rows.length && supabaseEnabled && supabase) {
    try {
      await supabase.from("dashboard_snapshots").insert({
        uploaded_by: uploadedBy, file_name: file.name, row_count: rows.length, data: rows,
      });
      source = "supabase";
    } catch { source = "local"; }
  }
  meta = { name: file.name, uploadedAt: new Date().toLocaleString(), rows: rows.length, loaded: rows.length, source };
  emit();
  return meta;
}

// On app load: pull the latest shared snapshot so every viewer sees the newest upload.
export async function loadLatestSnapshot(): Promise<void> {
  if (!supabaseEnabled || !supabase) return;
  try {
    const { data, error } = await supabase
      .from("dashboard_snapshots")
      .select("file_name, uploaded_at, row_count, data")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data || !Array.isArray((data as any).data)) return;
    const d: any = data;
    resources = d.data as Resource[];
    meta = { name: d.file_name || "snapshot", uploadedAt: new Date(d.uploaded_at).toLocaleString(), rows: d.row_count || d.data.length, loaded: d.data.length, source: "supabase" };
    emit();
  } catch { /* keep sample data */ }
}

export function resetToMock() { resources = generateResources(); meta = null; emit(); }
