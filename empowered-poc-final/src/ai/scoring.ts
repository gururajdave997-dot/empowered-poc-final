import type { Resource, FinderQuery, FinderResult } from "@/lib/types";

const windowFor = (s: string) =>
  s === "Available Now" ? 0 : s === "Available in 15 Days" ? 15 : s === "Available in 30 Days" ? 30 :
  s === "Available in 60 Days" ? 60 : s === "Available in 90 Days" ? 90 : 999;

export function scoreResource(r: Resource, q: FinderQuery): FinderResult | null {
  const reasons: string[] = [];
  let skillScore = 0;
  if (q.skills.length) {
    const rp = r.primarySkill, rs = r.secondarySkill;
    const hitPrimary = q.skills.includes(rp);
    const hitSecondary = q.skills.some((s) => s === rs);
    if (hitPrimary) { skillScore = 1; reasons.push(`primary skill ${rp}`); }
    else if (hitSecondary) { skillScore = 0.6; reasons.push(`secondary skill ${rs}`); }
    else return null; // must match a requested skill
  } else skillScore = 0.5;

  const win = windowFor(r.availabilityStatus);
  let availScore: number;
  if (q.availabilityWindowDays != null) {
    if (win > q.availabilityWindowDays) availScore = 0.15;
    else availScore = 1 - win / Math.max(90, q.availabilityWindowDays);
    reasons.push(win === 0 ? "available now" : `available in ${win}d`);
  } else availScore = win >= 999 ? 0.3 : 1 - win / 120;

  let expScore = 1;
  if (q.minExperience != null) {
    expScore = r.experience >= q.minExperience ? 1 : Math.max(0, r.experience / q.minExperience);
    reasons.push(`${r.experience}y exp`);
  }
  let bandScore = 1;
  if (q.band) { bandScore = r.band === q.band ? 1 : 0.4; if (r.band === q.band) reasons.push(r.band); }
  let certScore = 1;
  if (q.certification) { certScore = r.certifications.length ? 1 : 0.3; if (r.certifications.length) reasons.push("certified"); }

  const score = Math.round((skillScore * 35 + availScore * 25 + expScore * 20 + bandScore * 10 + certScore * 10));
  return { ...r, score, reason: reasons.join(" · ") };
}

export function runFinder(resources: Resource[], q: FinderQuery): FinderResult[] {
  return resources
    .map((r) => scoreResource(r, q))
    .filter((x): x is FinderResult => !!x)
    .sort((a, b) => b.score - a.score);
}
