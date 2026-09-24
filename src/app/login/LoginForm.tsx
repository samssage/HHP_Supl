"use client";
import { useActionState } from "react";
import { signIn, setPassword } from "./actions";

export default function LoginForm({ setup = false }: { setup?: boolean }) {
  const [message, action, pending] = useActionState(setup ? setPassword : signIn, "");
  const input = "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3";
  return <form action={action} className="mt-6 space-y-4">
    {!setup && <label className="block text-sm font-medium">Email
      <input className={input} name="email" type="email" autoComplete="username" required maxLength={254} />
    </label>}
    <label className="block text-sm font-medium">{setup ? "Choose a password" : "Password"}
      <input className={input} name="password" type="password" autoComplete={setup ? "new-password" : "current-password"} required minLength={setup ? 12 : 1} maxLength={1024} />
    </label>
    {setup && <label className="block text-sm font-medium">Confirm password
      <input className={input} name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} />
    </label>}
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60">
      {pending ? "Please wait…" : setup ? "Save password" : "Sign in"}
    </button>
  </form>;
}
