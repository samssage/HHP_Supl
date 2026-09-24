"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
export default function CompleteInvitation({ url, publicKey }: { url: string; publicKey: string }) {
  const started = useRef(false);
  const [message, setMessage] = useState("Checking your invitation…");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function complete() {
      const client = createBrowserClient(url, publicKey, { auth: { detectSessionInUrl: false } });
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      window.history.replaceState(null, "", "/auth/callback");
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (hash.has("error") || query.has("error")) throw new Error("Invalid link");
      if (access_token && refresh_token) {
        const { error } = await client.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
      } else if (query.get("code")) {
        const { error } = await client.auth.exchangeCodeForSession(query.get("code")!);
        if (error) throw error;
      } else throw new Error("Missing invitation");
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) throw new Error("Invalid session");
      window.location.replace(query.get("flow") === "signup" ? "/dashboard" : "/account");
    }
    complete().catch(() => setMessage("This link is invalid or has expired. Ask the equipment office for a new invitation."));
  }, [url, publicKey]);
  return <section className="mx-auto mt-8 max-w-md space-y-4"><h1 className="text-2xl font-semibold">Welcome to HHP</h1><p role="status">{message}</p><Link href="/login" className="underline">Back to sign in</Link></section>;
}
