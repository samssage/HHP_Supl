import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-server";
import { authConfig } from "@/lib/access";
import LoginForm from "../login/LoginForm";
export const dynamic = "force-dynamic";
export default async function Account() {
  if (!authConfig()) redirect("/login");
  const { data: { user }, error } = await (await authClient()).auth.getUser();
  if (error || !user) redirect("/login");
  return <section className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-surface p-8">
    <h1 className="text-2xl font-semibold">Set your password</h1>
    <p className="mt-3 text-muted">Choose a password with at least 12 characters for your equipment account.</p>
    <LoginForm setup />
  </section>;
}
