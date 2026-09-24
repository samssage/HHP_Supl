import Link from "next/link";
import { getCheckouts, getRequests, getStagings } from "@/lib/db";
import { isOverdue } from "@/lib/usage";
import { Badge, Card, PageTitle } from "@/components/ui";
import { RequestBadges } from "@/components/RequestBadges";

export default async function InUsePage() {
  const [checkouts, stagings, requests] = await Promise.all([
    getCheckouts({ activeOnly: true }),
    getStagings({ activeOnly: true }),
    getRequests({ openOnly: true }),
  ]);
  const sorted = [...checkouts].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)));
  const pieces = (lines: { qty: number }[]) => lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <PageTitle eyebrow="Right now" title="In use">
            What’s requested, signed out, and staged around the building.
          </PageTitle>
        </div>
        <div className="flex gap-2">
          <Link href="/signout/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink">Sign out</Link>
          <Link href="/staging/new" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium">Stage for semester</Link>
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Requests to pull ({requests.length})</h2>
          <Link href="/requests" className="text-sm underline">All requests</Link>
        </div>
        <Card className="divide-y divide-line">
          {requests.length === 0 && <p className="px-4 py-4 text-sm text-muted">No open requests.</p>}
          {requests.map((r) => (
            <Link key={r.id} href={`/requests/${r.id}`} className="flex flex-wrap items-center gap-2 px-4 py-3 hover:bg-chip/60">
              <span className="font-semibold">{r.person}</span>
              <span className="text-sm text-muted">{pieces(r.lines)} pcs · needed {new Date(r.neededAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
              <span className="ml-auto"><RequestBadges r={r} /></span>
            </Link>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Signed out ({checkouts.length})</h2>
        <Card className="divide-y divide-line">
          {sorted.length === 0 && <p className="px-4 py-4 text-sm text-muted">Nothing signed out.</p>}
          {sorted.map((c) => (
            <Link key={c.id} href={`/signout/${c.id}`} className="block px-4 py-3 hover:bg-chip/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.person}</span>
                {c.courseCode && <span className="font-mono text-sm text-muted">{c.courseCode}</span>}
                <span className="ml-auto">
                  {isOverdue(c) ? <Badge tone="bad">Overdue</Badge> : c.dueAt ? <Badge>Due {new Date(c.dueAt + "T12:00").toLocaleDateString()}</Badge> : <Badge>No due date</Badge>}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {c.lines.map((l) => `${l.qty} ${l.itemName}`).join(", ")}
              </p>
            </Link>
          ))}
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Staged this semester ({stagings.length})</h2>
        <Card className="divide-y divide-line">
          {stagings.length === 0 && <p className="px-4 py-4 text-sm text-muted">Nothing staged. Start from a course page, e.g. softball in the gym closet.</p>}
          {stagings.map((s) => (
            <Link key={s.id} href={`/staging/${s.id}`} className="block px-4 py-3 hover:bg-chip/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{s.title}</span>
                <span className="ml-auto text-sm text-muted">Rm {s.location}{s.schedule && ` · ${s.schedule}`}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{pieces(s.lines)} pieces{s.endsOn && ` · back by ${new Date(s.endsOn + "T12:00").toLocaleDateString()}`}</p>
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}
