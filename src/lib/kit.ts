import type { Audit, Course, Item, KitEdit } from "./types";

/** Tags that name a specific activity. Suggested items must not belong to an unrelated one. */
export const ACTIVITY_TAGS = new Set([
  "basketball", "football", "soccer", "kickball", "volleyball", "softball", "lacrosse",
  "tennis", "pickleball", "badminton", "racquetball", "golf", "track", "gymnastics",
  "self-defense", "yoga", "dance", "strength", "fitness", "assessment", "outdoor",
  "aquatics", "cpr",
]);

export type Kit = {
  core: Item[];
  suggested: Item[];
  gaps: string[];
};

function isUsable(i: Item) {
  return !i.isReference && i.condition !== "Retired";
}

export function buildKit(course: Course, items: Item[], edits: KitEdit[]): Kit {
  const removed = new Set(edits.filter((e) => e.action === "remove").map((e) => e.itemId));
  const added = new Set(edits.filter((e) => e.action === "add").map((e) => e.itemId));
  const allowed = new Set([...course.coreTags, ...course.suggestedTags]);

  const core: Item[] = [];
  const suggested: Item[] = [];
  for (const item of items) {
    if (!isUsable(item) || removed.has(item.id)) continue;
    if (added.has(item.id) || item.tags.some((t) => course.coreTags.includes(t))) {
      core.push(item);
    } else if (
      item.tags.some((t) => course.suggestedTags.includes(t)) &&
      item.tags.every((t) => !ACTIVITY_TAGS.has(t) || allowed.has(t))
    ) {
      suggested.push(item);
    }
  }

  const gaps = course.mustHave.filter((need) => {
    const words = need.toLowerCase().split(" ");
    return !core.some((i) => words.every((w) => i.name.toLowerCase().includes(w.replace(/s$/, ""))));
  });
  if (core.length === 0 && course.mustHave.length === 0) {
    gaps.push("No dedicated equipment on record for this course");
  }
  return { core, suggested, gaps };
}

export function groupByLocation(items: Item[]) {
  const groups = new Map<string, Item[]>();
  for (const i of items) {
    if (!groups.has(i.location)) groups.set(i.location, []);
    groups.get(i.location)!.push(i);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

export function formatQty(i: Pick<Item, "qty" | "qtyNote" | "unit">) {
  if (i.qtyNote) return `${i.qtyNote} ${i.unit}`;
  if (i.qty === null) return "Qty unknown";
  return `${i.qty} ${i.unit}`;
}

export function auditSummary(audit: Audit, tolerancePct: number) {
  const counted = audit.lines.filter((l) => l.counted !== null && !l.addedDuringAudit);
  const expected = counted.reduce((n, l) => n + (l.expected ?? 0), 0);
  const actual = counted.reduce((n, l) => n + (l.counted ?? 0), 0);
  const short = counted.filter((l) => l.expected !== null && (l.counted ?? 0) < l.expected);
  const over = counted.filter((l) => l.expected !== null && (l.counted ?? 0) > l.expected);
  const missingUnits = short.reduce((n, l) => n + (l.expected! - (l.counted ?? 0)), 0);
  const missingPct = expected > 0 ? (missingUnits / expected) * 100 : 0;
  return {
    linesCounted: counted.length,
    linesSkipped: audit.lines.length - counted.length - audit.lines.filter((l) => l.addedDuringAudit).length,
    found: audit.lines.filter((l) => l.addedDuringAudit),
    expected,
    actual,
    short,
    over,
    missingUnits,
    missingPct,
    withinMargin: missingPct <= tolerancePct,
  };
}

export function conditionTone(condition: string) {
  switch (condition) {
    case "New / Unissued":
    case "Excellent":
    case "Good":
      return "good";
    case "Fair":
    case "Pending":
    case "Backordered":
      return "warn";
    case "Poor":
    case "Retired":
      return "bad";
    default:
      return "muted";
  }
}
