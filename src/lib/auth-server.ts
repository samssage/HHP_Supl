import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authConfig } from "./access";

export async function authClient() {
  const jar = await cookies();
  const config = authConfig();
  if (!config) throw new Error("Supabase login configuration is incomplete.");
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server components cannot write cookies; proxy refreshes them. */ }
      },
    },
  });
}
