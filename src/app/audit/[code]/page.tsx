import { notFound } from "next/navigation";
import { getItems, getLocations } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { AuditForm } from "./AuditForm";

export default async function AuditPage({ params }: PageProps<"/audit/[code]">) {
  const { code } = await params;
  const room = (await getLocations()).find((l) => l.code === decodeURIComponent(code));
  if (!room || !room.auditable) notFound();
  const items = (await getItems())
    .filter((i) => i.location === room.code && i.condition !== "Retired")
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return (
    <div>
      <PageTitle eyebrow="Room count" title={room.name}>
        Count what’s actually on the shelf. Tap ✓ if it matches, or type the number you see. Skip anything you can’t
        get to — only counted items are updated.
      </PageTitle>
      <AuditForm
        location={room.code}
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          color: i.color,
          detail: [i.make, i.model].filter(Boolean).join(" "),
          expected: i.qty,
          unit: i.unit,
          category: i.category,
          condition: i.condition,
        }))}
      />
    </div>
  );
}
