import type { User } from "@supabase/supabase-js";

export function accessRequired() {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VERCEL || process.env.NODE_ENV === "production");
}

/** Only administrator-controlled metadata grants access, never user_metadata. */
export function isStaff(user: User | null) {
  return !!user?.email_confirmed_at && user.app_metadata?.hhp_staff === true;
}

export function authConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  let endpoint: URL;
  try { endpoint = new URL(url); } catch { return null; }
  if (!key.startsWith("sb_publishable_")) {
    try {
      if (JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role !== "anon") return null;
    } catch { return null; }
  }
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co") || key.startsWith("sb_secret_")) return null;
  return { url: endpoint.origin, key };
}
