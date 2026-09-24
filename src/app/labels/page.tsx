import { headers } from "next/headers";
import QRCode from "qrcode";
import { getLocations } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";

export default async function LabelsPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const rooms = (await getLocations()).filter((l) => l.auditable && l.code !== "Unassigned");
  const labels = await Promise.all(
    rooms.map(async (r) => ({
      room: r,
      url: `${origin}/audit/${r.code}`,
      svg: await QRCode.toString(`${origin}/audit/${r.code}`, { type: "svg", margin: 1 }),
    })),
  );

  return (
    <div>
      <div className="no-print flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <PageTitle eyebrow="Setup" title="QR door labels">
            Print and tape one inside each storage room. Pointing a phone camera at it opens that room’s count
            screen — no app to install.
          </PageTitle>
        </div>
        <PrintButton label="Print labels" />
      </div>
      {origin.includes("localhost") && (
        <p className="no-print mb-4 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          These codes point to {origin}, which only works on this computer. Print them once the app is deployed.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {labels.map(({ room, url, svg }) => (
          <div key={room.code} className="break-inside-avoid rounded-lg border-2 border-ink bg-white p-4 text-center text-black">
            <div className="text-xs font-semibold uppercase tracking-wide">HHP Equipment · Scan to count</div>
            <div className="mx-auto my-2 w-40" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="text-2xl font-bold">{room.name}</div>
            <div className="text-xs">{room.description}</div>
            <div className="mt-1 break-all text-[10px] text-gray-500">{url}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
