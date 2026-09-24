import { getItems } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { ScanLookup } from "./ScanLookup";

export default async function ScanPage() {
  const items = (await getItems()).filter((i) => !i.isReference);
  return (
    <div className="max-w-xl">
      <PageTitle eyebrow="Scan" title="What is this?">
        Point the camera at any label — our asset tags, or the manufacturer’s barcode or QR on newer equipment.
      </PageTitle>
      <ScanLookup items={items.map((i) => ({ id: i.id, label: `${i.id} ${i.name}${i.color ? ` (${i.color})` : ""} — Rm ${i.location}` }))} />
    </div>
  );
}
