import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudits, getCourses, getItem, getKitEdits, getItems, getLocations } from "@/lib/db";
import { buildKit, conditionTone, formatQty } from "@/lib/kit";
import { CONDITIONS } from "@/lib/types";
import { saveItem } from "@/app/actions";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const item = await getItem(decodeURIComponent(id));
  if (!item) notFound();
  const [locations, audits, courses, items, edits] = await Promise.all([
    getLocations(), getAudits(), getCourses(), getItems(), getKitEdits(),
  ]);
  const history = audits.flatMap((a) => a.lines.filter((l) => l.itemId === item.id).map((l) => ({ audit: a, line: l })));
  const usedIn = courses.filter((c) => {
    const kit = buildKit(c, items, edits.filter((e) => e.courseCode === c.code));
    return kit.core.some((i) => i.id === item.id);
  });

  const details: [string, string | null][] = [
    ["Inventory ID", item.id],
    ["Make", item.make],
    ["Model", item.model],
    ["Item / serial no.", item.itemNo],
    ["Color", item.color],
    ["Delivered", item.delivered],
    ["Also stored in", item.alsoLocation ? `Room ${item.alsoLocation}` : null],
    ["Last verified", item.lastVerified ? new Date(item.lastVerified).toLocaleString() : "Not since import"],
    ["Listed in 2018 as", item.originalName],
  ];
  const input = "w-full rounded-md border border-line bg-bg px-3 py-2";

  return (
    <div className="space-y-6">
      <PageTitle eyebrow={item.category} title={item.name}>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-semibold text-ink">{formatQty(item)}</span>
          <span>in</span>
          <Link href={`/rooms/${item.location}`} className="font-semibold text-ink underline">
            {item.location === "Unassigned" ? "no recorded room" : `Room ${item.location}`}
          </Link>
          <Badge tone={conditionTone(item.condition)}>{item.condition}</Badge>
          {item.controlled && <Badge tone="bad">Controlled — admin sign-out only</Badge>}
        </span>
      </PageTitle>

      {(item.description || item.notes) && (
        <Card className="p-4 text-sm">
          {item.description && <p>{item.description}</p>}
          {item.notes && <p className="mt-1 text-muted">{item.notes}</p>}
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Details</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {details.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {usedIn.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold">Used in</h3>
              <div className="flex flex-wrap gap-2">
                {usedIn.map((c) => (
                  <Link key={c.code} href={`/courses/${c.slug}`} className="rounded-full border border-line px-2.5 py-0.5 text-sm hover:border-brand">
                    {c.code} {c.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Update</h2>
          <form action={saveItem} className="grid grid-cols-2 gap-3 text-sm">
            <input type="hidden" name="id" value={item.id} />
            <label className="col-span-2">Name<input name="name" defaultValue={item.name} className={input} /></label>
            <label>Quantity<input name="qty" type="number" min={0} defaultValue={item.qty ?? ""} className={input} /></label>
            <label>Unit<input name="unit" defaultValue={item.unit} className={input} /></label>
            <label>Room
              <select name="location" defaultValue={item.location} className={input}>
                {locations.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </label>
            <label>Condition
              <select name="condition" defaultValue={item.condition} className={input}>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="col-span-2">Color<input name="color" defaultValue={item.color ?? ""} className={input} /></label>
            <label className="col-span-2">Notes<textarea name="notes" defaultValue={item.notes ?? ""} rows={2} className={input} /></label>
            <button className="col-span-2 rounded-md bg-brand py-2 font-medium text-brand-ink">Save changes</button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="border-b border-line px-4 py-2.5 font-semibold">Count history</h2>
        {history.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">Not counted yet.</p>
        ) : (
          <div className="divide-y divide-line text-sm">
            {history.map(({ audit, line }) => (
              <Link key={audit.id} href={`/audits/${audit.id}`} className="flex gap-3 px-4 py-2.5 hover:bg-chip/60">
                <span className="flex-1">{new Date(audit.performedAt).toLocaleString()} · {audit.performedBy}</span>
                <span className="font-mono">
                  {line.counted === null ? "not counted" : `${line.counted}${line.expected !== null ? ` / ${line.expected} expected` : ""}`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
