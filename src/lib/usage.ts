import type { Checkout, Item, Staging } from "./types";

export type Away = {
  signedOut: number;
  staged: number;
  total: number;
  checkouts: { checkout: Checkout; qty: number }[];
  stagings: { staging: Staging; qty: number }[];
};

/** How many of each item are away from their home shelf right now. */
export function awayByItem(checkouts: Checkout[], stagings: Staging[]) {
  const map = new Map<string, Away>();
  const get = (id: string) => {
    if (!map.has(id)) map.set(id, { signedOut: 0, staged: 0, total: 0, checkouts: [], stagings: [] });
    return map.get(id)!;
  };
  for (const c of checkouts) {
    if (c.returnedAt) continue;
    for (const l of c.lines) {
      const a = get(l.itemId);
      a.signedOut += l.qty;
      a.total += l.qty;
      a.checkouts.push({ checkout: c, qty: l.qty });
    }
  }
  for (const s of stagings) {
    if (s.returnedAt) continue;
    for (const l of s.lines) {
      const a = get(l.itemId);
      a.staged += l.qty;
      a.total += l.qty;
      a.stagings.push({ staging: s, qty: l.qty });
    }
  }
  return map;
}

/** Units that should be on the home shelf. Null when the total is unknown. */
export function onShelf(item: Item, away?: Away) {
  if (item.qty === null) return null;
  return Math.max(0, item.qty - (away?.total ?? 0));
}

export function isOverdue(c: Checkout, now = new Date()) {
  return !c.returnedAt && !!c.dueAt && new Date(c.dueAt + "T23:59:59") < now;
}

export function currentTerm(now = new Date()) {
  const m = now.getMonth();
  const y = now.getFullYear();
  if (m <= 4) return `Spring ${y}`;
  if (m <= 7) return `Summer ${y}`;
  return `Fall ${y}`;
}

/** Hours between now and when it's needed — under 24 is "last minute". */
export function leadHours(neededAt: string, from = new Date()) {
  return (new Date(neededAt).getTime() - from.getTime()) / 36e5;
}

/** Items shaped for the BatchBuilder picker, with what's actually on the shelf. */
export function toPickItems(items: Item[], away: Map<string, Away>) {
  return items
    .filter((i) => !i.isReference && i.condition !== "Retired")
    .map((i) => ({
      id: i.id,
      name: i.name,
      color: i.color,
      location: i.location,
      available: onShelf(i, away.get(i.id)),
      codes: [...(i.barcodes ?? []), ...(i.itemNo ? [i.itemNo] : [])],
    }));
}
