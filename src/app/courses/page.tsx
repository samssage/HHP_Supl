import Link from "next/link";
import { getCourses, getItems, getKitEdits } from "@/lib/db";
import { buildKit } from "@/lib/kit";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function CoursesPage() {
  const [courses, items, edits] = await Promise.all([getCourses(), getItems(), getKitEdits()]);
  const categories = [...new Set(courses.map((c) => c.category))];

  return (
    <div>
      <PageTitle eyebrow="By course" title="Skills courses">
        Every PE skills course at York. Pick one to see its equipment and where it’s kept.
      </PageTitle>
      <div className="space-y-6">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{cat}</h2>
            <Card className="divide-y divide-line">
              {courses
                .filter((c) => c.category === cat)
                .map((c) => {
                  const kit = buildKit(c, items, edits.filter((e) => e.courseCode === c.code));
                  return (
                    <Link key={c.code} href={`/courses/${c.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-chip/60">
                      <span className="w-16 shrink-0 font-mono text-sm font-semibold">{c.code}</span>
                      <span className="min-w-0 flex-1">
                        {c.title}
                        {!c.recentlyOffered && <span className="ml-2 text-xs text-muted">(not recently offered)</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm text-muted tabular-nums">{kit.core.length} items</span>
                        {kit.gaps.length > 0 && <Badge tone="warn">Gaps</Badge>}
                      </span>
                    </Link>
                  );
                })}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
