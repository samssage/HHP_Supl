import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequest } from "@/lib/db";
import { updateRequest } from "@/app/actions";
import { Card, PageTitle } from "@/components/ui";
import { RequestBadges } from "@/components/RequestBadges";

export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const r = await getRequest(id);
  if (!r) notFound();
  const open = r.status === "pending" || r.status === "ready";

  return (
    <div className="max-w-2xl space-y-6">
      <PageTitle
        eyebrow={`Request · sent ${new Date(r.createdAt).toLocaleString()}`}
        title={`${r.person}${r.courseCode ? ` · ${r.courseCode}` : ""}`}
      >
        <span className="block">
          Needed{" "}
          <strong className="text-ink">
            {new Date(r.neededAt).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </strong>
          {r.deliverTo && <> · {r.deliverTo}</>}
        </span>
        <span className="mt-2 block"><RequestBadges r={r} /></span>
      </PageTitle>

      <Card>
        <ul className="divide-y divide-line text-sm">
          {r.lines.map((l, i) => (
            <li key={i} className="flex gap-3 px-4 py-2.5">
              <span className="w-10 font-mono font-semibold">{l.qty}</span>
              {l.itemId ? (
                <Link href={`/items/${l.itemId}`} className="flex-1 hover:underline">{l.name}</Link>
              ) : (
                <span className="flex-1">{l.name} <span className="text-warn">— not in inventory</span></span>
              )}
            </li>
          ))}
        </ul>
      </Card>
      {r.notes && <Card className="p-4 text-sm">“{r.notes}”{r.email && <span className="text-muted"> — {r.email}</span>}</Card>}
      {r.statusNote && <p className="text-sm text-muted">Office note: {r.statusNote}</p>}

      {open && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">Equipment office</h2>
          <div className="flex flex-wrap gap-2">
            {r.status === "pending" && (
              <form action={updateRequest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="ready" />
                <button className="rounded-md bg-good px-4 py-2 text-sm font-medium text-white">Pulled — mark ready</button>
              </form>
            )}
            <Link href={`/signout/new?request=${r.id}`} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
              Hand over → sign out
            </Link>
          </div>
          <form action={updateRequest} className="flex flex-wrap gap-2 text-sm">
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="status" value="declined" />
            <input name="statusNote" placeholder="Reason (optional)" className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2" />
            <button className="rounded-md border border-line px-3 py-2 hover:border-bad hover:text-bad">Decline</button>
          </form>
        </Card>
      )}
      {r.checkoutId && (
        <Link href={`/signout/${r.checkoutId}`} className="text-sm underline">View the sign-out →</Link>
      )}
    </div>
  );
}
