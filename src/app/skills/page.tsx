import Link from "next/link";
import { getItems } from "@/lib/db";
import { SKILLS, itemsForSkill } from "@/lib/skills";
import { Card, PageTitle } from "@/components/ui";

export default async function SkillsPage() {
  const items = await getItems();
  return (
    <div>
      <PageTitle eyebrow="By skill" title="What are you working on?">
        Planning a drill rather than a sport? Pick a movement skill to see all the gear that supports it.
      </PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((s) => (
          <Link key={s.slug} href={`/skills/${s.slug}`}>
            <Card className="h-full p-4 transition hover:border-brand">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-semibold">{s.name}</h2>
                <span className="text-sm text-muted tabular-nums">{itemsForSkill(s, items).length}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{s.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
