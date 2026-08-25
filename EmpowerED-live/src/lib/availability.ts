// EmpowerED-live/src/lib/availability.ts
//
// Single source of truth for "how allocated / how available is this person".
// Both the Availability page and ResourceTable must use these helpers, so the
// cards, the Alloc % column and the Dashboard can never disagree again.

import type { Resource } from "@/lib/types";

/**
 * Normalised allocation, always as a percentage 0..100+.
 *
 * WHY THIS EXISTS: types.ts declares `allocationPct` as "0..100", but the
 * Time Sheet feed supplies FTE fractions (0.5 = half allocated). Rendering
 * that raw gives "0.5%", which rounds to 0% — the reported bug.
 *
 * ASSUMPTION: any value <= 1 is an FTE fraction, not a percentage. A literal
 * 1% allocation is not a real state in this system, whereas 1.0 FTE (fully
 * allocated) is the commonest one. If the feed is ever fixed to emit true
 * percentages, delete the `raw <= 1` branch.
 */
export function allocPct(r: Resource): number {
  const raw = Number(r.allocationPct);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw <= 1 ? raw * 100 : raw;
}

/** Person's total capacity as a percentage. Defaults to 100% when not set. */
export function capacityPct(r: Resource): number {
  const cap = Number(r.capacity);
  if (!Number.isFinite(cap) || cap <= 0) return 100;
  return cap <= 1 ? cap * 100 : cap;
}

/** Unused capacity as a percentage 0..100. This is what "available" means. */
export function freePct(r: Resource): number {
  return Math.max(0, Math.min(100, capacityPct(r) - allocPct(r)));
}

/** Display string for the Alloc % column. */
export function allocLabel(r: Resource): string {
  return `${Math.round(allocPct(r))}%`;
}

/** Display string for a free-capacity column. */
export function freeLabel(r: Resource): string {
  return `${Math.round(freePct(r))}%`;
}

export type Bucket = "bench" | "buffer" | "partial" | "allocated";

const said = (v?: string) => (v || "").toLowerCase();

/**
 * Mutually exclusive buckets, evaluated in priority order. Because a person
 * lands in exactly one, the counts add up — the old isBench/isBuffer pair both
 * returned true for the same person (Buffer label + "Resource Pool" dept),
 * which is why "Bench + Buffer" showed the same number as "Buffer" alone.
 */
export function bucketOf(r: Resource): Bucket {
  const alloc = allocPct(r);

  // 1. Nothing allocated at all.
  if (alloc <= 0) {
    // Buffer label wins over plain bench so the two lists stay meaningful.
    return said(r.billableBuffer).includes("buffer") ? "buffer" : "bench";
  }

  // 2. Explicitly flagged as Buffer capacity, even though partly allocated.
  if (said(r.billableBuffer).includes("buffer")) return "buffer";

  // 3. Allocated, but with real capacity left (the 0.5 FTE case).
  if (freePct(r) > 0) return "partial";

  // 4. Fully committed.
  return "allocated";
}

/** Anyone with capacity to give. */
export function isAvailable(r: Resource): boolean {
  return bucketOf(r) !== "allocated";
}

/** Sum of free capacity across a list, expressed in FTE. */
export function totalFreeFte(rows: Resource[]): number {
  return rows.reduce((sum, r) => sum + freePct(r) / 100, 0);
}
