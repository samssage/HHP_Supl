import Link from "next/link";
import { redirect } from "next/navigation";
import { getCourses, getItems, getLocations } from "@/lib/db";
import { matchCourse, searchCourses, searchItems } from "@/lib/search";
import { Card, ItemList, PageTitle, SearchBox } from "@/components/ui";

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q: raw } = await searchParams;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  const [items, courses, locations] = await Promise.all([getItems(), getCourses(), getLocations()]);

  const exactCourse = matchCourse(q, courses);
  if (exactCourse) redirect(`/courses/${exactCourse.slug}`);
  const room = locations.find((l) => l.code.toLowerCase() === q.toLowerCase().replace(/^(room|rm)\s*/, ""));
  if (room) redirect(`/rooms/${room.code}`);

  const courseHits = searchCourses(q, courses);
  const itemHits = searchItems(q, items);
  const total = itemHits.reduce((n, i) => n + (i.qty ?? 0), 0);

  return (
    <div>
      <div className="mb-6">
        <SearchBox defaultValue={q} autoFocus={!q} />
      </div>
      {q && (
        <PageTitle title={`Results for “${q}”`}>
          {itemHits.length} item{itemHits.length === 1 ? "" : "s"}
          {itemHits.length > 0 && ` · about ${total} units in total`}
        </PageTitle>
      )}

      {courseHits.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Courses</h2>
          <div className="flex flex-wrap gap-2">
            {courseHits.map((c) => (
              <Link key={c.code} href={`/courses/${c.slug}`} className="rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-brand">
                <span className="font-mono">{c.code}</span> {c.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {q && (
        <Card>
          <ItemList
            items={itemHits}
            empty="We don’t have anything on record matching that. It may be under another name — try a broader word, or browse by room."
          />
        </Card>
      )}
    </div>
  );
}
