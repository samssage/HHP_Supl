import type { Snapshot, Store } from "./store-types";

/** Server-only caller (db.ts) owns access. No keys or database responses are logged. */
export function usesSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!!url !== !!key) throw new Error("Set both SUPABASE_URL and SUPABASE_SECRET_KEY.");
  if (!url && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
    throw new Error("Supabase must be configured before running in production.");
  }
  return !!url;
}

async function rpc<T>(name: string, body: unknown): Promise<T> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is incomplete.");
  const endpoint = new URL(url);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL must be an HTTPS Supabase project URL.");
  }
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  // New secret keys are not JWTs. Only legacy service-role JWTs use Bearer auth.
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${endpoint.origin}/rest/v1/rpc/${name}`, {
    method: "POST", headers, body: JSON.stringify(body), cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status}). No local fallback was used.`);
  return response.json() as Promise<T>;
}

export async function readSupabase(): Promise<Snapshot> {
  const snapshot = await rpc<Snapshot>("hhp_read_store", {});
  if (!Number.isSafeInteger(snapshot.revision) || !snapshot.store || !Array.isArray(snapshot.store.items)) {
    throw new Error("Invalid database response. Apply the HHP migration first.");
  }
  return snapshot;
}

const buckets = ["items", "audits", "kitEdits", "checkouts", "stagings", "requests", "extraLocations"] as const;
type Change = { bucket: string; id: string; value: unknown | null };
function idFor(bucket: string, value: unknown): string {
  const row = value as Record<string, string>;
  if (bucket === "kitEdits") return JSON.stringify([row.courseCode, row.itemId]);
  return bucket === "extraLocations" ? row.code : row.id;
}

/** Only changed records are written; the revision check is atomic inside PostgreSQL. */
export async function commitSupabase(before: Snapshot, after: Store): Promise<boolean> {
  const changes: Change[] = [];
  for (const bucket of buckets) {
    const oldRows = new Map(before.store[bucket].map(row => [idFor(bucket, row), row]));
    for (const row of after[bucket]) {
      const id = idFor(bucket, row);
      if (JSON.stringify(oldRows.get(id)) !== JSON.stringify(row)) changes.push({ bucket, id, value: row });
      oldRows.delete(id);
    }
    for (const id of oldRows.keys()) changes.push({ bucket, id, value: null });
  }
  return rpc<boolean>("hhp_commit_store", {
    expected_revision: before.revision, changes, tolerance: after.tolerancePct,
  });
}
