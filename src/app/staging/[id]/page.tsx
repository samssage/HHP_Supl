import Link from "next/link";
import { notFound } from "next/navigation";
import { getItems, getStaging } from "@/lib/db";
import { endStaging } from "@/app/actions";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function StagingPage({ params }: PageProps<"/staging/[id]">) {
  const { id } = await params;
  const st = await getStaging(id);
  if (!st) notFound();
  const items = await getItems();
  const home = (itemId: string) => items.find((i) => i.id === itemId)?.location;
  const total = st.lines.reduce((n, l) => n + l.qty, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle eyebrow={`Semester staging · ${st.term}`} title={st.title}>
        <span className="flex flex-wrap items-center gap-2">
          <span>
            {total} pieces in <Link href={`/rooms/${st.location}`} className="font-semibold text-ink underline">Room {st.location}</Link>
            {st.schedule && ` · ${st.schedule}`}
            {st.endsOn && ` · back by ${new Date(st.endsOn + "T12:00").toLocaleDateString()}`}
          </span>
          {st.returnedAt ? <Badge tone="good">Returned</Badge> : <Badge tone="brand">Staged</Badge>}
        </span>
      </PageTitle>

      {st.returnedAt ? (
        <Card>
          <p className="border-b border-line px-4 py-2.5 text-sm">
            Verified and brought back by {st.returnedBy} on {new Date(st.returnedAt).toLocaleDateString()}.
          </p>
          <ul className="divide-y divide-line text-sm">
            {st.lines.map((l) => (
              <li key={l.itemId} className="flex gap-3 px-4 py-2.5">
                <Link href={`/items/${l.itemId}`} className="flex-1 hover:underline">{l.itemName}</Link>
                <span className={`font-mono ${l.returnedQty! < l.qty ? "font-semibold text-bad" : ""}`}>{l.returnedQty} / {l.qty}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <form action={endStaging}>
            <input type="hidden" name="id" value={st.id} />
            <div className="border-b border-line px-4 py-2.5">
              <h2 className="font-semibold">End of term — verify &amp; bring back</h2>
              <p className="text-sm text-muted">Count what’s in the closet. Anything short comes off the inventory.</p>
            </div>
            <ul className="divide-y divide-line text-sm">
              {st.lines.map((l) => (
                <li key={l.itemId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1">
                    <Link href={`/items/${l.itemId}`} className="hover:underline">{l.itemName}</Link>
                    <span className="block text-xs text-muted">{l.qty} staged · goes back to Rm {home(l.itemId)}</span>
                  </span>
                  <input name={`back:${l.itemId}`} type="number" min={0} max={l.qty} defaultValue={l.qty} aria-label={`${l.itemName} counted`} className="w-16 rounded-md border border-line bg-bg px-2 py-1.5 text-center font-mono" />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-line p-4">
              <input name="person" required placeholder="Your name" className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm" />
              <button className="rounded-md bg-good px-4 py-2 text-sm font-semibold text-white">Verify &amp; return</button>
            </div>
          </form>
        </Card>
      )}
      {st.notes && <p className="text-sm text-muted">Notes: {st.notes}</p>}
    </div>
  );
}
