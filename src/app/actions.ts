"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  addItem,
  addLocation,
  createCheckout,
  createRequest,
  createStaging,
  findByCode,
  getItems,
  linkBarcode,
  returnCheckout,
  returnStaging,
  saveAudit,
  setKitEdit,
  setRequestStatus,
  setTolerancePct,
  updateItem,
  type NewAuditLine,
} from "@/lib/db";
import type { BatchLine, EquipmentRequest, Item } from "@/lib/types";

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function int(fd: FormData, key: string) {
  const v = str(fd, key);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function editKit(fd: FormData) {
  const course = str(fd, "course");
  const item = str(fd, "item")?.split(" ")[0] ?? null;
  const action = str(fd, "action") as "add" | "remove" | "reset" | null;
  if (!course || !item || !action) return;
  await setKitEdit(course, item, action === "reset" ? null : action);
  refresh();
}

export async function saveItem(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  const patch: Partial<Item> = {
    name: str(fd, "name") ?? undefined,
    color: str(fd, "color"),
    qty: int(fd, "qty"),
    qtyNote: null,
    unit: str(fd, "unit") ?? "Each",
    location: str(fd, "location") ?? "Unassigned",
    condition: str(fd, "condition") ?? "To Verify",
    notes: str(fd, "notes"),
  };
  if (patch.name === undefined) delete patch.name;
  await updateItem(id, patch);
  refresh();
}

export async function createItem(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return;
  const item = await addItem({
    name,
    originalName: null,
    description: str(fd, "description"),
    make: str(fd, "make"),
    model: str(fd, "model"),
    itemNo: str(fd, "itemNo"),
    color: str(fd, "color"),
    qty: int(fd, "qty"),
    qtyNote: null,
    unit: str(fd, "unit") ?? "Each",
    location: str(fd, "location") ?? "Unassigned",
    alsoLocation: null,
    delivered: str(fd, "delivered"),
    condition: str(fd, "condition") ?? "New / Unissued",
    notes: str(fd, "notes"),
    tags: (str(fd, "tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    category: str(fd, "category") ?? "Other",
    controlled: fd.get("controlled") === "on",
    isReference: false,
    lastVerified: new Date().toISOString(),
    barcodes: str(fd, "barcode") ? [str(fd, "barcode")!] : [],
  });
  redirect(`/items/${item.id}`);
}

export async function submitAudit(input: {
  location: string;
  performedBy: string;
  notes: string | null;
  lines: NewAuditLine[];
}) {
  if (!input.performedBy.trim()) throw new Error("Please enter your name.");
  const audit = await saveAudit(input);
  return audit.id;
}

export async function saveTolerance(fd: FormData) {
  const pct = int(fd, "pct");
  if (pct === null || pct > 100) return;
  await setTolerancePct(pct);
  refresh();
}

// --- Lines coming from <BatchBuilder> --------------------------------------

type RawLine = { itemId: string | null; name: string; qty: number };

function parseLines(fd: FormData): RawLine[] {
  try {
    const raw = JSON.parse(str(fd, "lines") ?? "[]") as RawLine[];
    return raw.filter((l) => l.name && l.qty > 0).map((l) => ({ itemId: l.itemId, name: String(l.name), qty: Math.floor(l.qty) }));
  } catch {
    return [];
  }
}

function inventoryLines(lines: RawLine[]): BatchLine[] {
  return lines
    .filter((l): l is RawLine & { itemId: string } => !!l.itemId)
    .map((l) => ({ itemId: l.itemId, itemName: l.name, qty: l.qty, returnedQty: null }));
}

function returnedCounts(fd: FormData) {
  const out: Record<string, number> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("back:") && typeof v === "string" && v !== "") out[k.slice(5)] = Math.max(0, parseInt(v, 10));
  }
  return out;
}

export async function submitRequest(fd: FormData) {
  const person = str(fd, "person");
  const date = str(fd, "date");
  const lines = parseLines(fd);
  if (!person || !date || lines.length === 0) return;
  const r = await createRequest({
    person,
    email: str(fd, "email"),
    courseCode: str(fd, "course"),
    neededAt: new Date(`${date}T${str(fd, "time") ?? "08:00"}`).toISOString(),
    deliverTo: str(fd, "deliverTo"),
    lines,
    notes: str(fd, "notes"),
  });
  redirect(`/requests/${r.id}`);
}

export async function updateRequest(fd: FormData) {
  const id = str(fd, "id");
  const status = str(fd, "status") as EquipmentRequest["status"] | null;
  if (!id || !status) return;
  await setRequestStatus(id, status, str(fd, "statusNote"));
  refresh();
}

export async function submitCheckout(fd: FormData) {
  const person = str(fd, "person");
  const lines = inventoryLines(parseLines(fd));
  if (!person || lines.length === 0) return;
  const c = await createCheckout({
    person,
    courseCode: str(fd, "course"),
    purpose: str(fd, "purpose"),
    dueAt: str(fd, "dueAt"),
    handledBy: str(fd, "handledBy"),
    requestId: str(fd, "requestId"),
    lines,
    notes: str(fd, "notes"),
  });
  redirect(`/signout/${c.id}`);
}

export async function checkIn(fd: FormData) {
  const id = str(fd, "id");
  if (!id) return;
  await returnCheckout(id, returnedCounts(fd));
  refresh();
}

export async function submitStaging(fd: FormData) {
  const location = str(fd, "location");
  const title = str(fd, "title");
  const person = str(fd, "person");
  const lines = inventoryLines(parseLines(fd));
  if (!location || !title || !person || lines.length === 0) return;
  const st = await createStaging({
    title,
    courseCode: str(fd, "course"),
    term: str(fd, "term") ?? "",
    schedule: str(fd, "schedule"),
    location,
    person,
    endsOn: str(fd, "endsOn"),
    lines,
    notes: str(fd, "notes"),
  });
  redirect(`/staging/${st.id}`);
}

export async function endStaging(fd: FormData) {
  const id = str(fd, "id");
  const person = str(fd, "person");
  if (!id || !person) return;
  await returnStaging(id, person, returnedCounts(fd));
  refresh();
}

export async function createLocation(fd: FormData) {
  const code = str(fd, "code");
  if (!code) return;
  await addLocation({
    code,
    name: str(fd, "name") ?? code,
    description: str(fd, "description"),
    auditable: true,
    staging: fd.get("staging") === "on",
  });
  refresh();
}

/** Scanner lookup: returns the item a code belongs to, if any. */
export async function lookupCode(code: string) {
  const item = await findByCode(code);
  return item ? { id: item.id, name: item.name, location: item.location } : null;
}

export async function attachCode(fd: FormData) {
  const code = str(fd, "code");
  const item = str(fd, "item")?.split(" ")[0];
  if (!code || !item) return;
  const exists = (await getItems()).some((i) => i.id === item);
  if (!exists) return;
  await linkBarcode(item, code);
  redirect(`/items/${item}?linked=1`);
}
