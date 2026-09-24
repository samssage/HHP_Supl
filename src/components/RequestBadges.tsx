import { leadHours } from "@/lib/usage";
import { Badge } from "./ui";
import type { EquipmentRequest } from "@/lib/types";

export function RequestBadges({ r }: { r: EquipmentRequest }) {
  const lead = leadHours(r.neededAt, new Date(r.createdAt));
  const untilNeeded = leadHours(r.neededAt);
  const open = r.status === "pending" || r.status === "ready";
  return (
    <span className="flex flex-wrap gap-1.5">
      {r.status === "pending" && <Badge tone="warn">To pull</Badge>}
      {r.status === "ready" && <Badge tone="good">Ready</Badge>}
      {r.status === "fulfilled" && <Badge>Handed over</Badge>}
      {r.status === "declined" && <Badge tone="bad">Declined</Badge>}
      {lead < 24 && <Badge tone="bad">Last minute</Badge>}
      {open && untilNeeded < 0 && <Badge tone="bad">Past due</Badge>}
      {r.lines.some((l) => !l.itemId) && <Badge>Needs sourcing</Badge>}
    </span>
  );
}
