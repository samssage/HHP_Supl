import Link from "next/link";
import { getCheckouts, getCourse, getCourses, getItems, getKitEdits, getLocations, getStagings } from "@/lib/db";
import { buildKit } from "@/lib/kit";
import { awayByItem, currentTerm, onShelf, toPickItems } from "@/lib/usage";
import { submitStaging } from "@/app/actions";
import { BatchBuilder, type Line } from "@/components/BatchBuilder";
import { Card, PageTitle } from "@/components/ui";

export default async function NewStagingPage({ searchParams }: PageProps<"/staging/new">) {
  const sp = await searchParams;
  const course = typeof sp.course === "string" ? await getCourse(sp.course) : undefined;
  const [items, courses, checkouts, stagings, locations] = await Promise.all([
    getItems(), getCourses(), getCheckouts({ activeOnly: true }), getStagings({ activeOnly: true }), getLocations(),
  ]);
  const away = awayByItem(checkouts, stagings);

  let initial: Line[] = [];
  if (course) {
    const kit = buildKit(course, items, await getKitEdits(course.code));
    initial = kit.core
      .map((i) => ({ itemId: i.id, name: i.name, qty: onShelf(i, away.get(i.id)) ?? 1 }))
      .filter((l) => l.qty > 0);
  }
  const term = currentTerm();
  const rooms = locations.filter((l) => l.auditable && l.code !== "Unassigned");
  const stagingRooms = rooms.filter((l) => l.staging);
  const input = "w-full rounded-md border border-line bg-bg px-3 py-2";

  return (
    <div className="max-w-2xl">
      <PageTitle eyebrow="Semester staging" title="Stage gear for the semester">
        Move a course’s equipment to a closet near where the class meets. It stays there all term without being signed
        out, and everyone can see where it is. At the end of term you count it and bring it back.
      </PageTitle>
      {!course && (
        <p className="mb-4 text-sm text-muted">
          Tip: start from a course page (“Stage for the semester”) to pre-fill its equipment.{" "}
          <Link href="/courses" className="underline">Pick a course</Link>
        </p>
      )}
      <Card className="p-4">
        <form action={submitStaging} className="grid gap-4 text-sm sm:grid-cols-2">
          <label className="sm:col-span-2">Title *
            <input name="title" required defaultValue={course ? `${course.code} ${course.title} — ${term}` : ""} className={input} placeholder="e.g. PE 163 Softball — Fall 2026" />
          </label>
          <label>Course
            <select name="course" defaultValue={course?.code ?? ""} className={input}>
              <option value="">—</option>
              {courses.map((c) => <option key={c.code} value={c.code}>{c.code} {c.title}</option>)}
            </select>
          </label>
          <label>Term<input name="term" defaultValue={term} className={input} /></label>
          <label>Staged in *
            <select name="location" required defaultValue={stagingRooms[0]?.code} className={input}>
              {stagingRooms.length > 0 && (
                <optgroup label="Staging closets">
                  {stagingRooms.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                </optgroup>
              )}
              <optgroup label="Other rooms">
                {rooms.filter((l) => !l.staging).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </optgroup>
            </select>
            <Link href="/rooms#add" className="mt-1 inline-block text-xs text-muted underline">Closet not listed? Add it</Link>
          </label>
          <label>When the class meets<input name="schedule" className={input} placeholder="e.g. Wednesdays, gym" /></label>
          <label>Bring back by<input name="endsOn" type="date" className={input} /></label>
          <label>Staged by *<input name="person" required className={input} /></label>
          <div className="sm:col-span-2">
            <p className="mb-2 font-medium">Equipment going up *</p>
            <BatchBuilder items={toPickItems(items, away)} initial={initial} allowScan />
          </div>
          <label className="sm:col-span-2">Notes<input name="notes" className={input} placeholder="e.g. Moves outside after spring break" /></label>
          <button className="rounded-md bg-brand py-2.5 font-semibold text-brand-ink sm:col-span-2">Stage it</button>
        </form>
      </Card>
    </div>
  );
}
