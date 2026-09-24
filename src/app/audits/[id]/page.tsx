import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudit, getTolerancePct } from "@/lib/db";
import { auditSummary } from "@/lib/kit";
import { Card, PageTitle } from "@/components/ui";
import type { AuditLine } from "@/lib/types";

export default async function AuditDetail({ params }: PageProps<"/audits/[id]">) {
  const { id } = await params;
  const [audit, tolerance] = await Promise.all([getAudit(id), getTolerancePct()]);
  if (!audit) notFound();
  const s = auditSummary(audit, tolerance);

  return (
    <div className="space-y-6">
      <PageTitle eyebrow={`Count · ${new Date(audit.performedAt).toLocaleString()}`} title={`Room ${audit.location}`}>
        Counted by {audit.performedBy}
        {audit.notes && ` — “${audit.notes}”`}
      </PageTitle>

      <Card className={`p-5 ${s.withinMargin ? "bg-good-bg" : "bg-bad-bg"}`}>
        <p className={`text-lg font-semibold ${s.withinMargin ? "text-good" : "text-bad"}`}>
          {s.withinMargin
            ? `Within the ${tolerance}% margin`
            : `${s.missingPct.toFixed(1)}% of units missing — over the ${tolerance}% margin`}
        </p>
        <p className="mt-1 text-sm">
          {s.actual} of {s.expected} expected units found across {s.linesCounted} counted items.
          {s.missingUnits > 0 && ` ${s.missingUnits} units short.`}
          {s.linesSkipped > 0 && ` ${s.linesSkipped} items were skipped and left unchanged.`}
        </p>
      </Card>

      <Lines title="Short" lines={s.short} tone="text-bad" />
      <Lines title="More than expected" lines={s.over} tone="text-good" />
      <Lines title="Found — not on the list" lines={s.found} tone="" />

      <div className="flex gap-3 text-sm">
        <Link href={`/rooms/${audit.location}`} className="underline">Back to Room {audit.location}</Link>
        <Link href="/audits" className="underline">All counts</Link>
      </div>
    </div>
  );
}

function Lines({ title, lines, tone }: { title: string; lines: AuditLine[]; tone: string }) {
  if (lines.length === 0) return null;
  return (
    <Card>
      <h2 className="border-b border-line px-4 py-2.5 font-semibold">
        {title} ({lines.length})
      </h2>
      <div className="divide-y divide-line text-sm">
        {lines.map((l) => (
          <Link key={l.itemId} href={`/items/${l.itemId}`} className="flex gap-3 px-4 py-2.5 hover:bg-chip/60">
            <span className="flex-1">{l.itemName}</span>
            <span className={`font-mono ${tone}`}>
              {l.counted ?? "?"}
              {l.expected !== null && ` / ${l.expected}`}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
