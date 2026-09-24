import type { Audit, Checkout, Course, Disposal, EquipmentRequest, Item, KitEdit, Location, Staging } from "./types";

export type Store = {
  courses: Course[];
  locations: Location[];
  disposals: Disposal[];
  items: Item[];
  audits: Audit[];
  kitEdits: KitEdit[];
  tolerancePct: number;
  checkouts: Checkout[];
  stagings: Staging[];
  requests: EquipmentRequest[];
  extraLocations: Location[];
};

export type Snapshot = { revision: number; store: Store };
