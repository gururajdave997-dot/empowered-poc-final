import { useSyncExternalStore } from "react";
import * as XLSX from "xlsx";
import type { Resource, AvailabilityStatus } from "@/lib/types";
import { generateResources } from "./mockData";

type Source = "skill" | "timesheet";
interface SourceMeta { name: string; uploadedAt: string; rows: number; loaded: number; rejected: number; }

let resources: Resource[] = generateResources();
let meta: Record<Source, SourceMeta | null> = { skill: null, timesheet: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

export function useResources(): Resource[] {
  return useSyncExternalStore(subscribe, () => resources, () => resources);
}
export function useSourceMeta() {
  return useSyncExternalStore(subscribe, () => meta, () => meta);
}
export function getResources() { return resources; }

// ---- header normalization + alias map ----
const alias: Record<string, string> = {
  employeecode: "employeeCode", empcode: "employeeCode", code: "employeeCode",
  employeename: "name", name: "name",
  department: "department", dept: "department",
  businessunit: "businessUnit", bu: "businessUnit",
  band: "band", employeeband: "band",
  experience: "experience", exp: "experience",
  primaryskill: "primarySkill", secondaryskill: "secondarySkill",
  certifications: "certifications", certs: "certifications",
  proficiency: "proficiency", skillproficiency: "proficiency",
  currentproject: "currentProject", project: "currentProject",
  allocationpct: "allocationPct", allocation: "allocationPct", "allocation%": "allocationPct",
  timesheethours: "timesheetHours", hours: "timesheetHours",
  availabledate: "availableDate", availabilitydate: "availableDate",
  availabilitystatus: "availabilityStatus", status: "availabilityStatus",
};
const norm = (h: string) => alias[h.toLowerCase().replace(/[\s_]/g, "")] || h;

function statusFromDate(iso: string): AvailabilityStatus {
  const days = Math.round((new Date(iso).getTime() - new Date("2026-07-01").getTime()) / 86400000);
  if (isNaN(days)) return "Allocated";
  if (days <= 0) return "Available Now";
  if (days <= 15) return "Available in 15 Days";
  if (days <= 30) return "Available in 30 Days";
  if (days <= 60) return "Available in 60 Days";
  if (days <= 90) return "Available in 90 Days";
  return "Allocated";
}

// Parse an uploaded workbook and merge into the dataset by employeeCode.
export async function importWorkbook(source: Source, file: File): Promise<SourceMeta> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  let loaded = 0, rejected = 0;
  const byCode = new Map(resources.map((r) => [r.employeeCode, { ...r }]));

  for (const row of raw) {
    const o: Record<string, any> = {};
    Object.keys(row).forEach((k) => (o[norm(k)] = row[k]));
    const code = String(o.employeeCode || "").trim();
    if (!code) { rejected++; continue; }
    const existing = byCode.get(code) || ({ employeeCode: code } as Resource);
    if (source === "skill") {
      Object.assign(existing, {
        name: o.name || existing.name || code,
        department: o.department || existing.department || "Unknown",
        businessUnit: o.businessUnit || existing.businessUnit || "Unknown",
        band: o.band || existing.band || "Band 4",
        experience: Number(o.experience) || existing.experience || 0,
        primarySkill: o.primarySkill || existing.primarySkill || "",
        secondarySkill: o.secondarySkill || existing.secondarySkill || "",
        certifications: o.certifications ? String(o.certifications).split(/[;,]/).map((s: string) => s.trim()).filter(Boolean) : existing.certifications || [],
        proficiency: Number(o.proficiency) || existing.proficiency || 3,
      });
    } else {
      const allocation = Number(o.allocationPct) || 0;
      const availDate = o.availableDate ? String(o.availableDate).slice(0, 10) : existing.availableDate;
      Object.assign(existing, {
        name: o.name || existing.name || code,
        currentProject: o.currentProject || existing.currentProject || (allocation === 0 ? "Bench" : "Unknown"),
        allocationPct: allocation,
        timesheetHours: Number(o.timesheetHours) || 0,
        availableDate: availDate,
        availabilityStatus: (o.availabilityStatus as AvailabilityStatus) || statusFromDate(availDate),
      });
    }
    byCode.set(code, existing as Resource);
    loaded++;
  }
  resources = Array.from(byCode.values());
  const m: SourceMeta = { name: file.name, uploadedAt: new Date().toLocaleString(), rows: raw.length, loaded, rejected };
  meta = { ...meta, [source]: m };
  emit();
  return m;
}

export function resetToMock() { resources = generateResources(); meta = { skill: null, timesheet: null }; emit(); }
