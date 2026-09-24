import { getDisposals } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";

export default async function RetiredPage() {
  const rows = await getDisposals();
  return (
    <div>
      <PageTitle eyebrow="History" title="Disposal log">
        Equipment salvaged, donated or disposed of since 2015, from the master inventory workbook.
      </PageTitle>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              {["Date", "Item", "Make / model", "Qty", "Room", "Action", "Reason"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.date}</td>
                <td className="px-3 py-2">{r.item}</td>
                <td className="px-3 py-2 text-muted">{r.makeModel}</td>
                <td className="px-3 py-2">{r.qty}</td>
                <td className="px-3 py-2">{r.location}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2 text-muted">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
