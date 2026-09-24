import Link from "next/link";
import { notFound } from "next/navigation";
import { getItems, getLocations } from "@/lib/db";
import { Card, ItemList, PageTitle } from "@/components/ui";

export default async function RoomPage({ params }: PageProps<"/rooms/[code]">) {
  const { code } = await params;
  const room = (await getLocations()).find((l) => l.code === decodeURIComponent(code));
  if (!room) notFound();
  const items = (await getItems()).filter((i) => i.location === room.code || i.alsoLocation === room.code);
  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <PageTitle eyebrow="Room" title={room.name}>
            {room.description} · {items.length} items on record
          </PageTitle>
        </div>
        {room.auditable && (
          <Link href={`/audit/${room.code}`} className="rounded-lg bg-accent px-4 py-2 font-medium text-white">
            Count this room
          </Link>
        )}
      </div>
      <div className="space-y-4">
        {categories.map((cat) => (
          <Card key={cat}>
            <div className="border-b border-line px-4 py-2.5 font-semibold">{cat}</div>
            <ItemList items={items.filter((i) => i.category === cat)} showLocation={false} />
          </Card>
        ))}
      </div>
    </div>
  );
}
