import { createHash, timingSafeEqual } from "node:crypto";

/** Temporary shared staff access for the private pilot; individual roles come later. */
export function accessConfigured() {
  return !!process.env.HHP_STAFF_USER && !!process.env.HHP_STAFF_PASSWORD;
}

export function accessRequired() {
  return !!(process.env.HHP_STAFF_USER || process.env.HHP_STAFF_PASSWORD ||
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VERCEL || process.env.NODE_ENV === "production");
}

export function validStaffAuthorization(header: string | null) {
  if (!accessConfigured() || !header?.startsWith("Basic ")) return false;
  const expected = `${process.env.HHP_STAFF_USER}:${process.env.HHP_STAFF_PASSWORD}`;
  const provided = Buffer.from(header.slice(6), "base64").toString("utf8");
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(expected), hash(provided));
}
