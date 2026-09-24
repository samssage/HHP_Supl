import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { connection } from "next/server";
import { awayByItem } from "./usage";
import type { Audit, AuditLine, BatchLine, Checkout, Course, Disposal, EquipmentRequest, Item, KitEdit, Location, Staging } from "./types";

import type { Store } from "./store-types";
import { usesSupabase, readSupabase, commitSupabase } from "./supabase-store";
import { requireStaff } from "./require-staff";

// Reads and writes stay behind this server-only boundary.
const STORE_PATH = path.join(process.cwd(), ".data", "store.json");

async function localReference<T>(name: string): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), "src", "data", name + ".json"), "utf8")) as T;
  } catch {
    throw new Error("Local reference data is missing. Configure Supabase or restore your private src/data files.");
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<Store> {
  await connection();
  await requireStaff();
  if (usesSupabase()) return (await readSupabase()).store;
  const [seedItems, courses, locations, disposals] = await Promise.all([
    localReference<Item[]>("items"), localReference<Course[]>("courses"),
    localReference<Location[]>("locations"), localReference<Disposal[]>("disposals"),
  ]);
  try {
    const s = JSON.parse(await fs.readFile(STORE_PATH, "utf8")) as Partial<Store>;
    return {
      courses, locations, disposals,
      items: s.items ?? (seedItems as Item[]),
      audits: s.audits ?? [],
      kitEdits: s.kitEdits ?? [],
      tolerancePct: s.tolerancePct ?? 5,
      checkouts: s.checkouts ?? [],
      stagings: s.stagings ?? [],
      requests: s.requests ?? [],
      extraLocations: s.extraLocations ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const fresh: Store = {
      courses, locations, disposals,
      items: seedItems as Item[],
      audits: [],
      kitEdits: [],
      tolerancePct: 5,
      checkouts: [],
      stagings: [],
      requests: [],
      extraLocations: [],
    };
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(fresh, null, 1));
    return fresh;
  }
}

function mutate<T>(fn: (s: Store) => T): Promise<T> {
  const run = writeChain.then(async () => {
    await requireStaff();
    if (usesSupabase()) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const before = await readSupabase();
        const store = structuredClone(before.store);
        const result = fn(store);
        if (await commitSupabase(before, store)) return result;
      }
      throw new Error("Inventory changed while saving. Please try again.");
    }
    const store = await readStore();
    const result = fn(store);
    const temp = STORE_PATH + "." + crypto.randomUUID() + ".tmp";
    await fs.writeFile(temp, JSON.stringify(store, null, 1));
    await fs.rename(temp, STORE_PATH);
    return result;
  });
  writeChain = run.catch(() => {});
  return run;
}

function assertCount(value: number, label = "Quantity") {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + " must be a whole number of zero or more.");
}

function assertAvailable(s: Store, lines: BatchLine[]) {
  const away = awayByItem(s.checkouts, s.stagings);
  const totals = new Map<string, number>();
  if (!lines.length) throw new Error("Choose at least one item.");
  for (const line of lines) {
    assertCount(line.qty);
    if (line.qty === 0) throw new Error("Choose a quantity greater than zero.");
    totals.set(line.itemId, (totals.get(line.itemId) ?? 0) + line.qty);
  }
  for (const [id, qty] of totals) {
    const item = s.items.find(i => i.id === id);
    if (!item || item.isReference || item.condition === "Retired") throw new Error("Item is unavailable.");
    if (item.qty === null) throw new Error("Count " + item.name + " before signing it out or staging it.");
    if (qty > item.qty - (away.get(id)?.total ?? 0)) throw new Error("Not enough " + item.name + " on the shelf.");
  }
  if (totals.size !== lines.length) throw new Error("Combine duplicate items into one line.");
}

// --- Reads ------------------------------------------------------------------

export async function getItems(): Promise<Item[]> {
  return (await readStore()).items;
}

export async function getItem(id: string): Promise<Item | undefined> {
  return (await readStore()).items.find((i) => i.id === id);
}

export async function getCourses(): Promise<Course[]> {
  return (await readStore()).courses;
}

export async function getCourse(slug: string): Promise<Course | undefined> {
  const norm = slug.replace(/[\s-]/g, "").toLowerCase();
  return (await getCourses()).find((c) => c.slug === norm);
}

export async function getLocations(): Promise<Location[]> {
  const store = await readStore();
  const extra = store.extraLocations;
  const seed = store.locations;
  // Keep Unassigned / Reference at the end.
  const tail = seed.filter((l) => l.code === "Unassigned" || l.code === "Reference");
  return [...seed.filter((l) => !tail.includes(l)), ...extra, ...tail];
}

export async function getCheckouts(opts: { activeOnly?: boolean; itemId?: string } = {}) {
  let list = (await readStore()).checkouts;
  if (opts.activeOnly) list = list.filter((c) => !c.returnedAt);
  if (opts.itemId) list = list.filter((c) => c.lines.some((l) => l.itemId === opts.itemId));
  return [...list].sort((a, b) => b.outAt.localeCompare(a.outAt));
}

export async function getCheckout(id: string) {
  return (await readStore()).checkouts.find((c) => c.id === id);
}

export async function getRequests(opts: { openOnly?: boolean } = {}) {
  let list = (await readStore()).requests;
  if (opts.openOnly) list = list.filter((r) => r.status === "pending" || r.status === "ready");
  return [...list].sort((a, b) => a.neededAt.localeCompare(b.neededAt));
}

export async function getRequest(id: string) {
  return (await readStore()).requests.find((r) => r.id === id);
}

export async function getStagings(opts: { activeOnly?: boolean } = {}) {
  let list = (await readStore()).stagings;
  if (opts.activeOnly) list = list.filter((s) => !s.returnedAt);
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getStaging(id: string) {
  return (await readStore()).stagings.find((s) => s.id === id);
}

/** Resolve a scanned code: our own item URL / ID, a linked barcode, or the item no. from the sheet. */
export async function findByCode(raw: string): Promise<Item | undefined> {
  const items = (await readStore()).items;
  const code = raw.trim();
  const fromUrl = code.match(/\/items\/([A-Za-z0-9-]+)/)?.[1];
  const id = (fromUrl ?? code).toUpperCase();
  return (
    items.find((i) => i.id.toUpperCase() === id) ??
    items.find((i) => i.barcodes?.includes(code)) ??
    items.find((i) => i.itemNo && i.itemNo.replace(/\s/g, "").toUpperCase() === code.replace(/\s/g, "").toUpperCase())
  );
}

export async function getDisposals(): Promise<Disposal[]> {
  return (await readStore()).disposals;
}

export async function getAudits(): Promise<Audit[]> {
  const audits = (await readStore()).audits;
  return [...audits].sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export async function getAudit(id: string): Promise<Audit | undefined> {
  return (await readStore()).audits.find((a) => a.id === id);
}

export async function getKitEdits(courseCode?: string): Promise<KitEdit[]> {
  const edits = (await readStore()).kitEdits;
  return courseCode ? edits.filter((e) => e.courseCode === courseCode) : edits;
}

export async function getTolerancePct(): Promise<number> {
  return (await readStore()).tolerancePct;
}

// --- Writes -----------------------------------------------------------------

export function updateItem(id: string, patch: Partial<Item>) {
  return mutate((s) => {
    const item = s.items.find((i) => i.id === id);
    if (!item) throw new Error(`No item ${id}`);
    if (patch.qty !== undefined && patch.qty !== null) {
      assertCount(patch.qty);
      const away = awayByItem(s.checkouts, s.stagings).get(id)?.total ?? 0;
      if (patch.qty < away) throw new Error("Total owned cannot be less than equipment currently in use.");
    }
    Object.assign(item, patch, { id });
    return item;
  });
}

export function addItem(input: Omit<Item, "id">) {
  return mutate((s) => {
    if (input.qty !== null) assertCount(input.qty);
    const prefix = "NEW";
    const n = s.items.filter((i) => i.id.startsWith(prefix)).length + 1;
    const item: Item = { ...input, id: `${prefix}-${String(n).padStart(4, "0")}` };
    s.items.push(item);
    return item;
  });
}

export function setKitEdit(courseCode: string, itemId: string, action: "add" | "remove" | null) {
  return mutate((s) => {
    s.kitEdits = s.kitEdits.filter((e) => !(e.courseCode === courseCode && e.itemId === itemId));
    if (action) s.kitEdits.push({ courseCode, itemId, action });
  });
}

export function linkBarcode(itemId: string, code: string) {
  return mutate((s) => {
    for (const i of s.items) i.barcodes = i.barcodes?.filter((b) => b !== code);
    const item = s.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`No item ${itemId}`);
    item.barcodes = [...(item.barcodes ?? []), code];
  });
}

export function addLocation(loc: Location) {
  return mutate((s) => {
    if (s.extraLocations.some((l) => l.code === loc.code) || s.locations.some((l) => l.code === loc.code)) {
      throw new Error(`A room called ${loc.code} already exists.`);
    }
    s.extraLocations.push(loc);
  });
}

/** Anything not brought back comes off the item's total. */
function settleLines(s: Store, lines: BatchLine[], returned: Record<string, number>, now: string) {
  for (const line of lines) {
    const back = returned[line.itemId] ?? line.qty;
    assertCount(back, "Returned quantity");
    if (back > line.qty) throw new Error("Returned quantity cannot exceed the quantity taken.");
    line.returnedQty = back;
    const item = s.items.find((i) => i.id === line.itemId);
    if (!item) continue;
    if (item.qty !== null && back < line.qty) item.qty = Math.max(0, item.qty - (line.qty - back));
    item.lastVerified = now;
    if (item.condition === "To Verify") item.condition = "Good";
  }
}

export function createCheckout(input: Omit<Checkout, "id" | "outAt" | "returnedAt">) {
  return mutate((s) => {
    assertAvailable(s, input.lines);
    const c: Checkout = { ...input, id: crypto.randomUUID(), outAt: new Date().toISOString(), returnedAt: null };
    s.checkouts.push(c);
    if (input.requestId) {
      const r = s.requests.find((x) => x.id === input.requestId);
      if (r) {
        r.status = "fulfilled";
        r.checkoutId = c.id;
      }
    }
    return c;
  });
}

export function returnCheckout(id: string, returned: Record<string, number>) {
  return mutate((s) => {
    const c = s.checkouts.find((c) => c.id === id);
    if (!c || c.returnedAt) return;
    c.returnedAt = new Date().toISOString();
    settleLines(s, c.lines, returned, c.returnedAt);
  });
}

export function createStaging(input: Omit<Staging, "id" | "createdAt" | "returnedAt" | "returnedBy">) {
  return mutate((s) => {
    assertAvailable(s, input.lines);
    if (![...s.locations, ...s.extraLocations].some(l => l.code === input.location)) {
      throw new Error("Choose an existing staging room.");
    }
    const st: Staging = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), returnedAt: null, returnedBy: null };
    s.stagings.push(st);
    return st;
  });
}

/** End of term: record what came back and put it on the home shelf again. */
export function returnStaging(id: string, person: string, returned: Record<string, number>) {
  return mutate((s) => {
    const st = s.stagings.find((x) => x.id === id);
    if (!st || st.returnedAt) return;
    st.returnedAt = new Date().toISOString();
    st.returnedBy = person;
    settleLines(s, st.lines, returned, st.returnedAt);
  });
}

export function createRequest(input: Omit<EquipmentRequest, "id" | "createdAt" | "status" | "statusNote" | "checkoutId">) {
  return mutate((s) => {
    const r: EquipmentRequest = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "pending",
      statusNote: null,
      checkoutId: null,
    };
    s.requests.push(r);
    return r;
  });
}

export function setRequestStatus(id: string, status: EquipmentRequest["status"], note: string | null) {
  return mutate((s) => {
    const r = s.requests.find((x) => x.id === id);
    if (!r) return;
    if (!["pending", "ready", "fulfilled", "declined"].includes(status)) throw new Error("Invalid request status.");
    r.status = status;
    r.statusNote = note;
  });
}

export function setTolerancePct(pct: number) {
  return mutate((s) => {
    assertCount(pct, "Tolerance");
    if (pct > 100) throw new Error("Tolerance cannot exceed 100%.");
    s.tolerancePct = pct;
  });
}

export type NewAuditLine = {
  itemId: string | null; // null = found something not on the list
  /** Set when counting gear staged in this room for a semester rather than stored here. */
  stagingId?: string | null;
  name: string;
  counted: number | null;
  condition: string | null;
  note: string | null;
  /** A scanned code to attach to a newly found item. */
  barcode?: string | null;
};

/**
 * Record a room count. Counted lines update the item's quantity, condition and
 * last-verified date; lines left blank are recorded as "not counted" and change nothing.
 *
 * Home-shelf lines expect (total − signed out − staged elsewhere), so staged gear is never
 * reported missing. Staged lines are checked against what was staged in this room.
 */
export function saveAudit(input: {
  location: string;
  performedBy: string;
  notes: string | null;
  lines: NewAuditLine[];
}) {
  return mutate((s) => {
    const now = new Date().toISOString();
    const away = awayByItem(s.checkouts, s.stagings);
    const lines: AuditLine[] = [];
    const verify = (item: Item, condition: string | null) => {
      item.lastVerified = now;
      if (condition) item.condition = condition;
      else if (item.condition === "To Verify") item.condition = "Good";
    };

    const seen = new Set<string>();
    for (const l of input.lines) {
      if (l.counted !== null) assertCount(l.counted, "Count");
      if (l.itemId) {
        const key = JSON.stringify([l.itemId, l.stagingId ?? null]);
        if (seen.has(key)) throw new Error("An item was counted twice.");
        seen.add(key);
      }
      if (l.itemId && l.stagingId) {
        const st = s.stagings.find((x) => x.id === l.stagingId && !x.returnedAt);
        const line = st?.lines.find((x) => x.itemId === l.itemId);
        const item = s.items.find((i) => i.id === l.itemId);
        if (!st || !line || !item || st.location !== input.location) throw new Error("Staged item does not belong to this room.");
        lines.push({
          itemId: item.id,
          itemName: `${item.name} (staged: ${st.title})`,
          expected: line.qty,
          counted: l.counted,
          condition: l.condition,
          note: l.note,
          addedDuringAudit: false,
        });
        if (l.counted !== null) {
          if (item.qty !== null) item.qty = Math.max(0, item.qty + (l.counted - line.qty));
          line.qty = l.counted;
          verify(item, l.condition);
        }
      } else if (l.itemId) {
        const item = s.items.find((i) => i.id === l.itemId);
        if (!item || item.location !== input.location) throw new Error("Item does not belong to this room.");
        const awayQty = away.get(item.id)?.total ?? 0;
        const expected = item.qty === null ? null : Math.max(0, item.qty - awayQty);
        lines.push({
          itemId: item.id,
          itemName: item.name,
          expected,
          counted: l.counted,
          condition: l.condition,
          note: l.note,
          addedDuringAudit: false,
        });
        if (l.counted !== null) {
          item.qty = l.counted + awayQty;
          item.qtyNote = null;
          verify(item, l.condition);
        }
      } else if (l.name.trim()) {
        const n = s.items.filter((i) => i.id.startsWith("NEW")).length + 1;
        const id = `NEW-${String(n).padStart(4, "0")}`;
        s.items.push({
          id,
          name: l.name.trim(),
          originalName: null,
          description: null,
          make: null,
          model: null,
          itemNo: null,
          color: null,
          qty: l.counted,
          qtyNote: null,
          unit: "Each",
          location: input.location,
          alsoLocation: null,
          delivered: null,
          condition: l.condition || "Good",
          notes: `Found during ${input.location} count by ${input.performedBy}.${l.note ? " " + l.note : ""}`,
          tags: [],
          category: "Other",
          controlled: false,
          isReference: false,
          lastVerified: now,
          barcodes: l.barcode ? [l.barcode] : [],
        });
        lines.push({
          itemId: id,
          itemName: l.name.trim(),
          expected: null,
          counted: l.counted,
          condition: l.condition,
          note: l.note,
          addedDuringAudit: true,
        });
      }
    }
    const audit: Audit = {
      id: crypto.randomUUID(),
      location: input.location,
      performedBy: input.performedBy,
      performedAt: now,
      notes: input.notes,
      lines,
    };
    s.audits.push(audit);
    return audit;
  });
}
