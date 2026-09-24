"use client";
import { useActionState, useState } from "react";
import { signIn, setPassword, signUp } from "./actions";

export default function LoginForm({ setup = false, initialSignup = false }: { setup?: boolean; initialSignup?: boolean }) {
  const [signup, setSignup] = useState(initialSignup);
  const [message, action, pending] = useActionState(setup ? setPassword : signup ? signUp : signIn, "");
  const newPassword = setup || signup;
  const input = "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-3";
  return <form action={action} className="mt-6 space-y-4">
    {!setup && <label className="block text-sm font-medium">Email
      <input className={input} name="email" type="email" autoComplete="username" required maxLength={254} />
    </label>}
    <label className="block text-sm font-medium">{newPassword ? "Choose a password" : "Password"}
      <input className={input} name="password" type="password" autoComplete={newPassword ? "new-password" : "current-password"} required minLength={newPassword ? 12 : 1} maxLength={1024} />
    </label>
    {newPassword && <label className="block text-sm font-medium">Confirm password
      <input className={input} name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} />
    </label>}
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    <button disabled={pending} className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60">
      {pending ? "Please wait…" : setup ? "Save password" : signup ? "Create account" : "Sign in"}
    </button>
    {!setup && <button type="button" disabled={pending} onClick={() => setSignup(!signup)} className="w-full py-2 text-sm underline">{signup ? "Already have an account? Sign in" : "New here? Create an account"}</button>}
  </form>;
}
