import { currentStaff } from "@/lib/require-staff";
import Link from "next/link";
import { getAudits, getItems, getLocations } from "@/lib/db";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function RoomsPage() {
  const staff = await currentStaff();
  const [locations, items, audits] = await Promise.all([getLocations(), getItems(), getAudits()]);
  return (
    <div>
      <PageTitle eyebrow="By room" title="Rooms & storage">
        Open a room to see what equipment is stored there.
      </PageTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {locations.map((l) => {
          const inRoom = items.filter((i) => i.location === l.code);
          const toVerify = inRoom.filter((i) => i.condition === "To Verify").length;
          const last = audits.find((a) => a.location === l.code);
          return (
            <Card key={l.code} className="flex flex-col p-4">
              <Link href={`/rooms/${l.code}`} className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{l.name}</h2>
                  <span className="text-sm text-muted">{inRoom.length} items</span>
                </div>
                {l.description && <p className="text-sm text-muted">{l.description}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {toVerify > 0 ? <Badge tone="warn">{toVerify} to verify</Badge> : <Badge tone="good">All verified</Badge>}
                  {staff && <Badge>{last ? `Last counted ${new Date(last.performedAt).toLocaleDateString()}` : "Never counted"}</Badge>}
                </div>
              </Link>
              {staff && l.auditable && (
                <Link href={`/audit/${l.code}`} className="mt-3 rounded-md bg-accent py-2 text-center text-sm font-medium text-white">
                  Count this room
                </Link>
              )}
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-muted">
        <Link href="/labels" className="underline">Print QR door labels</Link> so anyone can scan a room with their phone camera.
      </p>
    </div>
  );
}
