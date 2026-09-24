import { notFound } from "next/navigation";
import { getItems } from "@/lib/db";
import { SKILLS, itemsForSkill } from "@/lib/skills";
import { groupByLocation } from "@/lib/kit";
import { Card, ItemList, PageTitle } from "@/components/ui";

export default async function SkillPage({ params }: PageProps<"/skills/[slug]">) {
  const { slug } = await params;
  const skill = SKILLS.find((s) => s.slug === slug);
  if (!skill) notFound();
  const list = itemsForSkill(skill, await getItems());
  return (
    <div>
      <PageTitle eyebrow="By skill" title={skill.name}>
        {list.length} items across {groupByLocation(list).length} rooms.
      </PageTitle>
      <div className="space-y-4">
        {groupByLocation(list).map(([loc, items]) => (
          <Card key={loc}>
            <div className="border-b border-line px-4 py-2.5 font-semibold">{loc === "Unassigned" ? "No room recorded" : `Room ${loc}`}</div>
            <ItemList items={items} showLocation={false} />
          </Card>
        ))}
      </div>
    </div>
  );
}
