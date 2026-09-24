import { authConfig } from "@/lib/access";
import LoginForm from "./LoginForm";
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  return <section className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
    <p className="text-sm font-medium text-muted">York College · Health &amp; Human Performance</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to HHP</h1>
    <p className="mt-3 text-muted">Sign in to find equipment, manage requests, and keep room counts up to date.</p>
    {notice === "confirm" && <p role="alert" className="mt-4 text-sm">Confirm your email before signing in.</p>}
    {notice === "unavailable" && <p role="alert" className="mt-4 text-sm">Sign-in is temporarily unavailable. Please try again.</p>}
    {authConfig() ? <LoginForm /> : <p role="status" className="mt-6 rounded-lg bg-chip p-4">Sign-in is being set up. Please check back shortly.</p>}
    <p className="mt-6 text-sm text-muted">Need help with your account? Contact the equipment office.</p>
  </section>;
}
