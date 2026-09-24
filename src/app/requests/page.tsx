import Link from "next/link";
import { getRequests } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";
import { RequestBadges } from "@/components/RequestBadges";
import type { EquipmentRequest } from "@/lib/types";

export default async function RequestsPage() {
  const all = await getRequests();
  const open = all.filter((r) => r.status === "pending" || r.status === "ready");
  const closed = all.filter((r) => !open.includes(r)).reverse().slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <PageTitle eyebrow="Equipment office" title="Requests">
            Soonest first. Pull the list, mark it ready, then hand it over to turn it into a sign-out.
          </PageTitle>
        </div>
        <Link href="/requests/new" className="rounded-lg bg-accent px-4 py-2 font-medium text-white">New request</Link>
      </div>
      <List title={`Open (${open.length})`} list={open} empty="Nothing waiting." />
      {closed.length > 0 && <List title="Recent" list={closed} empty="" />}
    </div>
  );
}

function List({ title, list, empty }: { title: string; list: EquipmentRequest[]; empty: string }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <Card className="divide-y divide-line">
        {list.length === 0 && <p className="px-4 py-4 text-sm text-muted">{empty}</p>}
        {list.map((r) => (
          <Link key={r.id} href={`/requests/${r.id}`} className="block px-4 py-3 hover:bg-chip/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{r.person}</span>
              {r.courseCode && <span className="font-mono text-sm text-muted">{r.courseCode}</span>}
              <span className="ml-auto text-sm">
                {new Date(r.neededAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span className="flex-1">
                {r.lines.length} item{r.lines.length === 1 ? "" : "s"}: {r.lines.slice(0, 4).map((l) => `${l.qty} ${l.name}`).join(", ")}
                {r.lines.length > 4 && "…"}
              </span>
              <RequestBadges r={r} />
            </div>
          </Link>
        ))}
      </Card>
    </section>
  );
}
