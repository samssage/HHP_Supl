import { currentStaff } from "@/lib/require-staff";
import Link from "next/link";
import { getCourses, getItems, getLocations } from "@/lib/db";
import { Card, SearchBox } from "@/components/ui";

const ENTRY = [
  { href: "/courses", title: "By course", body: "PE 141 – PE 287 skills courses and the gear each one uses" },
  { href: "/skills", title: "By skill", body: "Throwing, agility, balance, striking… find gear for a drill" },
  { href: "/rooms", title: "By room", body: "What’s in 106A, 107A, 200B, 305 and the rest" },
  { href: "/items", title: "By equipment", body: "Every item, filterable by category and condition" },
];

export default async function Home() {
  const staff = await currentStaff();
  const [items, courses, locations] = await Promise.all([getItems(), getCourses(), getLocations()]);
  const tracked = items.filter((i) => !i.isReference && i.condition !== "Retired");
  const toVerify = tracked.filter((i) => i.condition === "To Verify").length;
  const verifiedPct = Math.round(((tracked.length - toVerify) / tracked.length) * 100);

  return (
    <div className="space-y-8">
      <section className="space-y-4 pt-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What are you teaching?</h1>
        <p className="max-w-2xl text-muted">
          Look up any Health &amp; Human Performance skills course, sport, room or piece of equipment and see what we
          have and exactly where it lives.
        </p>
        <SearchBox size="lg" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {ENTRY.map((e) => (
          <Link key={e.href} href={e.href}>
            <Card className="h-full p-5 transition hover:border-brand">
              <h2 className="font-semibold">{e.title} →</h2>
              <p className="mt-1 text-sm text-muted">{e.body}</p>
            </Card>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Items tracked" value={tracked.length} />
        <Stat label="Skills courses" value={courses.length} />
        <Stat label="Rooms" value={locations.filter((l) => l.auditable && l.code !== "Unassigned").length} />
        <Stat label="Verified" value={`${verifiedPct}%`} hint={`${toVerify} still “To Verify”`} />
      </section>

      {staff ? <Card className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h2 className="font-semibold">Walking into a storage room?</h2>
          <p className="text-sm text-muted">
            Scan the QR label on the door with your phone camera, or pick the room here. Count what’s on the shelf, and
            the inventory updates.
          </p>
        </div>
        <Link href="/rooms" className="rounded-lg bg-accent px-4 py-2 font-medium text-white">
          Count a room
        </Link>
      </Card> : <Card className="p-5"><h2 className="font-semibold">Need equipment for a class?</h2><Link href="/requests/new" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-white">Request equipment</Link></Card>}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}
