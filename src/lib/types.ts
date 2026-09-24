export type Item = {
  id: string;
  name: string;
  originalName: string | null;
  description: string | null;
  make: string | null;
  model: string | null;
  itemNo: string | null;
  color: string | null;
  qty: number | null;
  qtyNote: string | null;
  unit: string;
  location: string;
  alsoLocation: string | null;
  delivered: string | null;
  condition: string;
  notes: string | null;
  tags: string[];
  category: string;
  controlled: boolean;
  isReference: boolean;
  lastVerified?: string | null;
  /** Codes already printed on the item (manufacturer QR/barcode) or our own asset tag. */
  barcodes?: string[];
};

export type Course = {
  code: string;
  slug: string;
  title: string;
  credits: number;
  category: string;
  sport: string;
  recentlyOffered: boolean;
  notes: string | null;
  coreTags: string[];
  suggestedTags: string[];
  mustHave: string[];
};

export type Location = {
  code: string;
  name: string;
  description: string | null;
  auditable: boolean;
  /** A closet near where a class meets, where gear is kept for the semester. */
  staging?: boolean;
};

export type Disposal = {
  date: string | null;
  item: string | null;
  makeModel: string | null;
  qty: string | null;
  location: string | null;
  action: string | null;
  reason: string | null;
  source: string | null;
};

export type AuditLine = {
  itemId: string;
  itemName: string;
  expected: number | null;
  counted: number | null;
  condition: string | null;
  note: string | null;
  addedDuringAudit: boolean;
};

export type Audit = {
  id: string;
  location: string;
  performedBy: string;
  performedAt: string;
  notes: string | null;
  lines: AuditLine[];
};

export type BatchLine = { itemId: string; itemName: string; qty: number; returnedQty: number | null };

/**
 * A sign-out: the equipment manager hands someone a set of items (it's rarely just one)
 * and records it here. Returned together, with a count of what came back.
 */
export type Checkout = {
  id: string;
  person: string;
  courseCode: string | null;
  purpose: string | null;
  outAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  handledBy: string | null;
  requestId: string | null;
  lines: BatchLine[];
  notes: string | null;
};

/**
 * Faculty ask ahead of time instead of at the last minute. Lines can be inventory items
 * or free text for things we don't own yet (e.g. "juggling balls").
 */
export type EquipmentRequest = {
  id: string;
  person: string;
  email: string | null;
  courseCode: string | null;
  neededAt: string;
  deliverTo: string | null;
  lines: { itemId: string | null; name: string; qty: number }[];
  notes: string | null;
  createdAt: string;
  status: "pending" | "ready" | "fulfilled" | "declined";
  statusNote: string | null;
  checkoutId: string | null;
};

/**
 * Semester staging: a course's gear lives in another closet for the term (e.g. softball
 * in the gym closet on Wednesdays). Not signed out day to day; verified and brought back at term end.
 */
export type Staging = {
  id: string;
  title: string;
  courseCode: string | null;
  term: string;
  schedule: string | null;
  location: string;
  person: string;
  createdAt: string;
  endsOn: string | null;
  returnedAt: string | null;
  returnedBy: string | null;
  lines: BatchLine[];
  notes: string | null;
};

export type KitEdit = { courseCode: string; itemId: string; action: "add" | "remove" };

export const CONDITIONS = [
  "New / Unissued",
  "Excellent",
  "Good",
  "Fair",
  "Poor",
  "To Verify",
  "Pending",
  "Backordered",
  "Retired",
] as const;
