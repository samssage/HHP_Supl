import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getItems, getKitEdits, getLocations } from "@/lib/db";
import { buildKit, groupByLocation } from "@/lib/kit";
import { editKit } from "@/app/actions";
import { Badge, Card, ItemList, PageTitle } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";

export default async function CoursePage({ params }: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();
  const [items, edits, locations] = await Promise.all([getItems(), getKitEdits(course.code), getLocations()]);
  const kit = buildKit(course, items, edits);
  const roomName = (code: string) => locations.find((l) => l.code === code);
  const removed = edits.filter((e) => e.action === "remove").map((e) => items.find((i) => i.id === e.itemId)!).filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <PageTitle eyebrow={`${course.code} · ${course.credits} credit${course.credits > 1 ? "s" : ""} · ${course.category}`} title={course.title}>
            {kit.core.length} items on record for this course, in {groupByLocation(kit.core).length} room
            {groupByLocation(kit.core).length === 1 ? "" : "s"}.
            {!course.recentlyOffered && " This course is in the catalog but hasn’t been offered recently."}
          </PageTitle>
        </div>
        <PrintButton label="Print pull list" />
      </div>

      {kit.gaps.length > 0 && (
        <Card className="border-warn/40 bg-warn-bg p-4">
          <h2 className="font-semibold text-warn">Not on record</h2>
          <p className="mt-1 text-sm">
            We couldn’t find: <strong>{kit.gaps.join(", ")}</strong>. It may be stored under another name, missing
            from the inventory, or need to be ordered.
          </p>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Core equipment</h2>
        <div className="space-y-4">
          {groupByLocation(kit.core).map(([loc, list]) => (
            <Card key={loc}>
              <RoomHeader code={loc} description={roomName(loc)?.description} count={list.length} />
              <ItemList items={list} showLocation={false} />
            </Card>
          ))}
          {kit.core.length === 0 && <p className="text-sm text-muted">No core equipment on record.</p>}
        </div>
      </section>

      {kit.suggested.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Also useful for skill work</h2>
          <p className="mb-3 text-sm text-muted">Cones, pinnies, spots, lead-up balls and other gear instructors often pull for this class.</p>
          <div className="space-y-4">
            {groupByLocation(kit.suggested).map(([loc, list]) => (
              <Card key={loc}>
                <RoomHeader code={loc} description={roomName(loc)?.description} count={list.length} />
                <ItemList items={list} showLocation={false} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <details className="no-print rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer font-medium">Edit this course’s equipment list</summary>
        <div className="mt-4 space-y-4 text-sm">
          <form action={editKit} className="flex flex-wrap gap-2">
            <input type="hidden" name="course" value={course.code} />
            <input type="hidden" name="action" value="add" />
            <input
              name="item"
              list="all-items"
              placeholder="Add an item — start typing its name"
              className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2"
            />
            <datalist id="all-items">
              {items.filter((i) => !i.isReference).map((i) => (
                <option key={i.id} value={`${i.id} ${i.name}${i.color ? ` (${i.color})` : ""}`} />
              ))}
            </datalist>
            <button className="rounded-md bg-brand px-3 py-2 font-medium text-brand-ink">Add to core</button>
          </form>
          <div>
            <p className="mb-2 text-muted">Remove an item from this course:</p>
            <div className="flex flex-wrap gap-2">
              {kit.core.map((i) => (
                <form key={i.id} action={editKit}>
                  <input type="hidden" name="course" value={course.code} />
                  <input type="hidden" name="item" value={i.id} />
                  <input type="hidden" name="action" value="remove" />
                  <button className="rounded-full border border-line px-2.5 py-1 hover:border-bad hover:text-bad">
                    {i.name}
                    {i.color ? ` · ${i.color}` : ""} ✕
                  </button>
                </form>
              ))}
            </div>
          </div>
          {removed.length > 0 && (
            <div>
              <p className="mb-2 text-muted">Removed from this course:</p>
              <div className="flex flex-wrap gap-2">
                {removed.map((i) => (
                  <form key={i.id} action={editKit}>
                    <input type="hidden" name="course" value={course.code} />
                    <input type="hidden" name="item" value={i.id} />
                    <input type="hidden" name="action" value="reset" />
                    <button className="rounded-full border border-line px-2.5 py-1 text-muted hover:border-brand">
                      {i.name} ↺ restore
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function RoomHeader({ code, description, count }: { code: string; description?: string | null; count: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
      <Link href={`/rooms/${code}`} className="font-semibold hover:underline">
        {code === "Unassigned" ? "No room recorded" : `Room ${code}`}
      </Link>
      {description && <span className="truncate text-sm text-muted">{description}</span>}
      <span className="ml-auto">
        <Badge>{count}</Badge>
      </span>
    </div>
  );
}
