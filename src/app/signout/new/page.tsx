import { getCheckouts, getCourses, getItems, getRequest, getStagings } from "@/lib/db";
import { awayByItem, toPickItems } from "@/lib/usage";
import { submitCheckout } from "@/app/actions";
import { BatchBuilder, type Line } from "@/components/BatchBuilder";
import { Card, PageTitle } from "@/components/ui";

export default async function NewSignOutPage({ searchParams }: PageProps<"/signout/new">) {
  const sp = await searchParams;
  const request = typeof sp.request === "string" ? await getRequest(sp.request) : undefined;
  const itemId = typeof sp.item === "string" ? sp.item : null;
  const [items, courses, checkouts, stagings] = await Promise.all([
    getItems(), getCourses(), getCheckouts({ activeOnly: true }), getStagings({ activeOnly: true }),
  ]);

  let initial: Line[] = [];
  if (request) initial = request.lines.filter((l) => l.itemId).map((l) => ({ itemId: l.itemId, name: l.name, qty: l.qty }));
  else if (itemId) {
    const it = items.find((i) => i.id === itemId);
    if (it) initial = [{ itemId: it.id, name: it.name, qty: 1 }];
  }
  const unsourced = request?.lines.filter((l) => !l.itemId) ?? [];
  const input = "w-full rounded-md border border-line bg-bg px-3 py-2";

  return (
    <div className="max-w-2xl">
      <PageTitle eyebrow="Equipment office" title="Sign out equipment">
        Record who’s taking what. Scan the items as you hand them over, or search for them.
      </PageTitle>
      <Card className="p-4">
        <form action={submitCheckout} className="grid gap-4 text-sm sm:grid-cols-2">
          {request && <input type="hidden" name="requestId" value={request.id} />}
          <label>Taken by *<input name="person" required defaultValue={request?.person} className={input} placeholder="e.g. Erin" /></label>
          <label>Course
            <select name="course" defaultValue={request?.courseCode ?? ""} className={input}>
              <option value="">—</option>
              {courses.map((c) => <option key={c.code} value={c.code}>{c.code} {c.title}</option>)}
            </select>
          </label>
          <label>For<input name="purpose" className={input} placeholder="e.g. 6 class sessions" /></label>
          <label>Back by<input name="dueAt" type="date" className={input} /></label>
          <div className="sm:col-span-2">
            <p className="mb-2 font-medium">Items *</p>
            {unsourced.length > 0 && (
              <p className="mb-2 rounded-md bg-warn-bg px-3 py-2 text-warn">
                Also requested, not in inventory: {unsourced.map((l) => `${l.qty} ${l.name}`).join(", ")}
              </p>
            )}
            <BatchBuilder items={toPickItems(items, awayByItem(checkouts, stagings))} initial={initial} allowScan />
          </div>
          <label>Handed over by<input name="handledBy" className={input} placeholder="Your name" /></label>
          <label>Notes<input name="notes" className={input} /></label>
          <button className="rounded-md bg-brand py-2.5 font-semibold text-brand-ink sm:col-span-2">Sign out</button>
        </form>
      </Card>
    </div>
  );
}
