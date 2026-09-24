import Link from "next/link";
import { notFound } from "next/navigation";
import { getCheckout, getItems } from "@/lib/db";
import { isOverdue } from "@/lib/usage";
import { checkIn } from "@/app/actions";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function SignOutPage({ params }: PageProps<"/signout/[id]">) {
  const { id } = await params;
  const c = await getCheckout(id);
  if (!c) notFound();
  const items = await getItems();
  const loc = (itemId: string) => items.find((i) => i.id === itemId)?.location;
  const short = c.lines.filter((l) => l.returnedQty !== null && l.returnedQty < l.qty);

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle eyebrow={`Signed out ${new Date(c.outAt).toLocaleString()}`} title={`${c.person}${c.courseCode ? ` · ${c.courseCode}` : ""}`}>
        <span className="flex flex-wrap items-center gap-2">
          {c.purpose && <span>{c.purpose}</span>}
          {c.dueAt && <span>· back by {new Date(c.dueAt + "T12:00").toLocaleDateString()}</span>}
          {c.returnedAt ? <Badge tone="good">Returned {new Date(c.returnedAt).toLocaleDateString()}</Badge> : isOverdue(c) ? <Badge tone="bad">Overdue</Badge> : <Badge tone="warn">Out</Badge>}
        </span>
      </PageTitle>

      {c.returnedAt ? (
        <Card>
          <ul className="divide-y divide-line text-sm">
            {c.lines.map((l) => (
              <li key={l.itemId} className="flex gap-3 px-4 py-2.5">
                <Link href={`/items/${l.itemId}`} className="flex-1 hover:underline">{l.itemName}</Link>
                <span className={`font-mono ${l.returnedQty! < l.qty ? "font-semibold text-bad" : ""}`}>{l.returnedQty} / {l.qty} back</span>
              </li>
            ))}
          </ul>
          {short.length > 0 && <p className="border-t border-line px-4 py-2.5 text-sm text-bad">Missing items were taken off the inventory count.</p>}
        </Card>
      ) : (
        <Card>
          <form action={checkIn}>
            <input type="hidden" name="id" value={c.id} />
            <h2 className="border-b border-line px-4 py-2.5 font-semibold">Check in — how many came back?</h2>
            <ul className="divide-y divide-line text-sm">
              {c.lines.map((l) => (
                <li key={l.itemId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1">
                    <Link href={`/items/${l.itemId}`} className="hover:underline">{l.itemName}</Link>
                    <span className="block text-xs text-muted">Goes back to Rm {loc(l.itemId)} · {l.qty} out</span>
                  </span>
                  <input name={`back:${l.itemId}`} type="number" min={0} max={l.qty} defaultValue={l.qty} aria-label={`${l.itemName} returned`} className="w-16 rounded-md border border-line bg-bg px-2 py-1.5 text-center font-mono" />
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-4">
              <button className="w-full rounded-md bg-good py-2.5 font-semibold text-white">Check everything in</button>
            </div>
          </form>
        </Card>
      )}
      {c.handledBy && <p className="text-sm text-muted">Handed over by {c.handledBy}.</p>}
    </div>
  );
}
