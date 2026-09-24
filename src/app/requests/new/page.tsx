import { getAvailability, getCourse, getCourses, getItems, getKitEdits, getLocations } from "@/lib/db";
import { buildKit } from "@/lib/kit";
import { toPickItems } from "@/lib/usage";
import { submitRequest } from "@/app/actions";
import { BatchBuilder, type Line } from "@/components/BatchBuilder";
import { Card, PageTitle } from "@/components/ui";

export default async function NewRequestPage({ searchParams }: PageProps<"/requests/new">) {
  const sp = await searchParams;
  const courseSlug = typeof sp.course === "string" ? sp.course : null;
  const [items, courses, away, locations] = await Promise.all([
    getItems(), getCourses(), getAvailability(), getLocations(),
  ]);
  const course = courseSlug ? await getCourse(courseSlug) : undefined;
  let initial: Line[] = [];
  if (course) {
    const kit = buildKit(course, items, await getKitEdits(course.code));
    initial = kit.core.slice(0, 12).map((i) => ({ itemId: i.id, name: i.name, qty: Math.min(i.qty ?? 1, 12) }));
  }
  const defaultDate = new Date();
  defaultDate.setUTCDate(defaultDate.getUTCDate() + 2);
  const tomorrow = defaultDate.toISOString().slice(0, 10);
  const input = "w-full rounded-md border border-line bg-bg px-3 py-2";

  return (
    <div className="max-w-2xl">
      <PageTitle eyebrow="Faculty" title="Request equipment">
        Tell the equipment office what you need and when. Asking at least a day ahead means it’s pulled and waiting for
        you — no last-minute scramble.
      </PageTitle>
      <Card className="p-4">
        <form action={submitRequest} className="grid gap-4 text-sm sm:grid-cols-2">
          <label>Your name *<input name="person" required className={input} /></label>
          <p className="self-end py-2 text-muted">Your account email will be attached to this request.</p>
          <label className="sm:col-span-2">Course
            <select name="course" defaultValue={course?.code ?? ""} className={input}>
              <option value="">Not for a specific course</option>
              {courses.map((c) => <option key={c.code} value={c.code}>{c.code} {c.title}</option>)}
            </select>
          </label>
          <label>Needed on *<input name="date" type="date" required defaultValue={tomorrow} className={input} /></label>
          <label>At<input name="time" type="time" defaultValue="09:00" className={input} /></label>
          <label className="sm:col-span-2">Where should it be?
            <input name="deliverTo" list="rooms" placeholder="e.g. Gym, Room 200 — or ‘I’ll pick it up’" className={input} />
            <datalist id="rooms">
              {locations.filter((l) => l.auditable).map((l) => <option key={l.code} value={l.name} />)}
              <option value="I’ll pick it up" />
            </datalist>
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 font-medium">What do you need? *</p>
            <BatchBuilder items={toPickItems(items, away)} initial={initial} allowFreeText />
          </div>
          <label className="sm:col-span-2">Anything else?<textarea name="notes" rows={2} className={input} placeholder="e.g. It’s for 6 class sessions through October" /></label>
          <button className="rounded-md bg-accent py-2.5 font-semibold text-white sm:col-span-2">Send request</button>
        </form>
      </Card>
    </div>
  );
}
