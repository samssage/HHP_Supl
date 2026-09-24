import Link from "next/link";
import { getAudits, getItems, getTolerancePct } from "@/lib/db";
import { auditSummary } from "@/lib/kit";
import { saveTolerance } from "@/app/actions";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function AuditsPage() {
  const [audits, tolerance, items] = await Promise.all([getAudits(), getTolerancePct(), getItems()]);
  const tracked = items.filter((i) => !i.isReference);
  const verified = tracked.filter((i) => i.condition !== "To Verify").length;

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Inventory" title="Room counts">
        Every count, who did it, and whether the room came in within the acceptable margin.
      </PageTitle>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm text-muted">Verified since import</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {verified} <span className="text-base font-normal text-muted">/ {tracked.length} items</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-chip">
            <div className="h-full bg-good" style={{ width: `${(verified / tracked.length) * 100}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <form action={saveTolerance} className="flex flex-wrap items-end gap-2">
            <label className="text-sm text-muted">
              Acceptable margin — flag a room if more than this % of units are missing
              <span className="mt-1 flex items-center gap-2">
                <input name="pct" type="number" min={0} max={100} defaultValue={tolerance} className="w-20 rounded-md border border-line bg-bg px-2 py-1.5 text-ink" />
                <span className="text-ink">%</span>
              </span>
            </label>
            <button className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink">Save</button>
          </form>
        </Card>
      </div>

      <Card className="divide-y divide-line">
        {audits.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">
            No counts yet. <Link href="/rooms" className="underline">Pick a room</Link> to start.
          </p>
        )}
        {audits.map((a) => {
          const s = auditSummary(a, tolerance);
          return (
            <Link key={a.id} href={`/audits/${a.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-chip/60">
              <span className="w-24 font-semibold">Room {a.location}</span>
              <span className="flex-1 text-sm text-muted">
                {new Date(a.performedAt).toLocaleString()} · {a.performedBy} · {s.linesCounted} items counted
              </span>
              {s.withinMargin ? (
                <Badge tone="good">Within margin</Badge>
              ) : (
                <Badge tone="bad">{s.missingPct.toFixed(1)}% missing</Badge>
              )}
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
