import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { authClient } from "@/lib/auth-server";
import { accessRequired, authConfig, isStaff } from "@/lib/access";
import { signOut } from "./login/actions";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HHP Equipment Finder",
  description: "Find, locate and count Health & Human Performance equipment at York College.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const NAV = [
  { href: "/courses", label: "Courses" },
  { href: "/skills", label: "Skills" },
  { href: "/rooms", label: "Rooms" },
  { href: "/items", label: "Equipment" },
  { href: "/audits", label: "Counts" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let signedIn = false;
  let staff = !accessRequired();
  if (authConfig()) {
    try {
      const { data: { user }, error } = await (await authClient()).auth.getUser();
      signedIn = !error && !!user;
      staff = !error && isStaff(user);
    } catch { /* Public login remains available during an auth outage. */ }
  }
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-sm font-bold text-brand-ink">
                HHP
              </span>
              <span className="hidden sm:inline">Equipment Finder</span>
            </Link>
            {staff && <nav className="ml-auto hidden gap-1 text-sm md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted hover:bg-chip hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>}
            {staff && <Link
              href="/rooms"
              className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white md:ml-2"
            >
              Count a room
            </Link>}
            {signedIn && <form action={signOut} className="ml-auto"><button className="rounded-md px-3 py-2 text-sm text-muted">Sign out</button></form>}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-12">{children}</main>
        {staff && <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface text-xs md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="py-3 text-center text-muted active:bg-chip">
              {n.label}
            </Link>
          ))}
        </nav>}
      </body>
    </html>
  );
}
