"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-server";
import { isMember } from "@/lib/access";

export async function signIn(_state: string, form: FormData) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || !password || email.length > 254 || password.length > 1024) return "Enter your email and password.";
  try {
    const client = await authClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return "Unable to sign in. Check your email and password, then try again.";
    if (!isMember(data.user)) {
      await client.auth.signOut({ scope: "local" });
      return "Confirm your email before signing in.";
    }
  } catch { return "Sign-in is temporarily unavailable. Please try again shortly."; }
  redirect("/");
}
export async function signOut() {
  const client = await authClient();
  await client.auth.signOut({ scope: "local" });
  redirect("/login");
}
export async function setPassword(_state: string, form: FormData) {
  const password = String(form.get("password") || "");
  if (password.length < 12 || password.length > 1024) return "Use a password with at least 12 characters.";
  if (password !== form.get("confirm")) return "The passwords do not match.";
  try {
    const client = await authClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return "Your invitation has expired. Ask the equipment office for a new one.";
    const result = await client.auth.updateUser({ password });
    if (result.error) return "The password could not be saved. Try a different password or request a new invitation.";
  } catch { return "Unable to save your password. Please try again."; }
  redirect("/");
}

export async function signUp(_state: string, form: FormData) {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || email.length > 254 || password.length < 12 || password.length > 1024) return "Enter your email and a password with at least 12 characters.";
  if (password !== form.get("confirm")) return "The passwords do not match.";
  let signedIn = false;
  try {
    const client = await authClient();
    const origin = (await headers()).get("origin");
    if (!origin) return "Please reload this page and try again.";
    const { data, error } = await client.auth.signUp({ email, password, options: {
      emailRedirectTo: new URL("/auth/callback?flow=signup", origin).toString(),
    } });
    if (error) return "Unable to create an account right now. Try signing in if you already have an account, or contact the equipment office.";
    signedIn = !!data.session && isMember(data.user);
  } catch { return "Account signup is temporarily unavailable. Please try again."; }
  if (signedIn) redirect("/");
  return "Check your email to confirm your account, then return here to sign in.";
}
