// EmpowerED-live/src/lib/availability.ts
//
// Display helpers for capacity / allocation / availability.
//
// DEFINITIONS ARE TAKEN FROM THE DASHBOARD, which is the page the business
// trusts. Do not "improve" them here without changing the Dashboard too:
//
//   Billable (324) + Buffer (61) = every record (385)
//   Bench (11) is a SUBSET of Buffer, not a third group.
//   Buffer FTE (55.25) = sum of the `capacity` field over buffer records.
//
// So Bench and Buffer deliberately OVERLAP. The Availability cards must read
// as "61 available, of which 11 are on bench" — never as 11 + 61 = 72.

import type { Resource } from "@/lib/types";

const said = (v?: string) => (v || "").toLowerCase();

/**
 * Allocation as a percentage 0..100.
 *
 * types.ts declares allocationPct as "0..100" but the Time Sheet feed sends
 * FTE fractions (0.5 = half allocated). Rendering that raw gave "0.5%", which
 * rounded to 0% — the original bug. Anything <= 1 is treated as FTE; a literal
 * 1% allocation is not a real state, whereas 1.0 FTE is the commonest one.
 */
export function allocPct(r: Resource): number {
  const raw = Number(r.allocationPct);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw <= 1 ? raw * 100 : raw;
}

/** Capacity in FTE. 1.0 when the field is absent. */
export function capacityFte(r: Resource): number {
  const cap = Number(r.capacity);
  if (!Number.isFinite(cap) || cap <= 0) return 1;
  return cap > 1.5 ? cap / 100 : cap; // tolerate a feed that sends 50 for 0.5
}

export const capacityPct = (r: Resource) => capacityFte(r) * 100;

/** Unused capacity as a percentage of this person's own capacity. */
export const freePct = (r: Resource) =>
  Math.max(0, Math.min(100, capacityPct(r) - allocPct(r)));

export const freeFte = (r: Resource) => (capacityPct(r) - allocPct(r)) / 100;

export const allocLabel = (r: Resource) => `${Math.round(allocPct(r))}%`;
export const freeLabel = (r: Resource) => `${Math.round(freePct(r))}%`;
/** "1.0" / "0.5" — the half-timers that were previously invisible. */
export const capacityLabel = (r: Resource) => capacityFte(r).toFixed(1);
export const isPartTime = (r: Resource) => capacityFte(r) < 1;

// --- Pool membership: same tests the Dashboard uses. Bench ⊂ Buffer. -------

export const isBench = (r: Resource) =>
  said(r.billableBuffer).includes("bench") ||
  said(r.currentProject) === "bench" ||
  said(r.department).includes("resource pool");

export const isBuffer = (r: Resource) => said(r.billableBuffer).includes("buffer");

/** Everyone in the available pool — bench and buffer, de-duplicated. */
export const isAvailable = (r: Resource) => isBench(r) || isBuffer(r);

/** Spare capacity of a list, in FTE. Matches the Dashboard's Buffer FTE. */
export const totalFreeFte = (rows: Resource[]) =>
  rows.reduce((s, r) => s + Math.max(0, capacityFte(r)), 0);

// --- One line per person --------------------------------------------------
//
// The feed carries ONE ROW PER ALLOCATION, so a person with two allocation
// records appears twice in any list (employee 2962 is the visible example) and
// ResourceTable's key={employeeCode} collides. Merge them for display.
//
// Counts: FTE is preserved exactly (capacities are summed), so the total still
// reconciles with the Dashboard. The HEADCOUNT legitimately drops, because it
// was previously counting records rather than people.

// --- Status derived from capacity, not from the row's own alloc field ------
//
// A buffer record with capacity 0.5 and allocationPct 0 means HALF of this
// person is already committed elsewhere. Reading only allocationPct made the
// badge say "Unallocated" when the person is really half booked.

/** How much of a FULL FTE is already committed, 0..100. */
export const committedPct = (r: Resource) => Math.max(0, Math.min(100, 100 - freePct(r)));

export type PoolStatus = "Unallocated" | "Partially Allocated" | "Fully Allocated";

export function poolStatus(r: Resource): PoolStatus {
  const free = freePct(r);
  if (free >= 100) return "Unallocated";
  if (free > 0) return "Partially Allocated";
  return "Fully Allocated";
}

export const poolTone = (r: Resource): "green" | "amber" | "red" => {
  const free = freePct(r);
  return free >= 100 ? "green" : free > 0 ? "amber" : "red";
};

/** Grouping key. Falls back to the name when the code is missing or "na". */
function personKey(r: Resource): string {
  const code = (r.employeeCode || "").trim().toLowerCase();
  return !code || code === "na" ? `name:${said(r.name)}` : code;
}

const filledCount = (r: Resource) =>
  Object.values(r).filter((v) => v !== "" && v != null && v !== "Unspecified").length;

/** Collapse allocation rows into one row per person, preserving total FTE. */
export function dedupeByPerson(rows: Resource[]): Resource[] {
  const groups = new Map<string, Resource[]>();
  for (const r of rows) {
    const k = personKey(r);
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }

  const out: Resource[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) { out.push(group[0]); continue; }

    // Richest row wins, so merged rows don't inherit "Unspecified" fields.
    const base = group.reduce((a, b) => (filledCount(b) > filledCount(a) ? b : a), group[0]);
    const capacity = group.reduce((s, r) => s + capacityFte(r), 0);
    const allocated = group.reduce((s, r) => s + allocPct(r), 0);
    const projects = Array.from(new Set(group.map((r) => r.currentProject).filter(Boolean)));

    out.push({
      ...base,
      capacity,
      allocationPct: allocated,          // already a percentage
      currentProject: projects.join(", ") || base.currentProject,
      experience: Math.max(...group.map((r) => Number(r.experience) || 0)),
      timesheetHours: group.reduce((s, r) => s + (Number(r.timesheetHours) || 0), 0),
      secondarySkill: base.secondarySkill ||
        (group.map((r) => r.secondarySkill).find(Boolean) ?? ""),
    });
  }
  return out;
}
