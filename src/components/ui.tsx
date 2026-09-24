import Link from "next/link";
import type { Item } from "@/lib/types";
import { conditionTone, formatQty } from "@/lib/kit";

export function Badge({ tone = "muted", children }: { tone?: string; children: React.ReactNode }) {
  const cls =
    tone === "good"
      ? "bg-good-bg text-good"
      : tone === "warn"
        ? "bg-warn-bg text-warn"
        : tone === "bad"
          ? "bg-bad-bg text-bad"
          : tone === "brand"
            ? "bg-brand text-brand-ink"
            : "bg-chip text-muted";
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="text-sm font-medium text-accent">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface ${className}`}>{children}</div>;
}

export function ItemRow({ item, showLocation = true }: { item: Item; showLocation?: boolean }) {
  return (
    <Link href={`/items/${item.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-chip/60">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{item.name}</span>
          {item.color && <span className="text-sm text-muted [overflow-wrap:anywhere]">· {item.color}</span>}
          {item.controlled && <Badge tone="bad">Controlled</Badge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          {[item.make, item.model].filter(Boolean).join(" ") || null}
          <Badge tone={conditionTone(item.condition)}>{item.condition}</Badge>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-semibold">{formatQty(item)}</div>
        {showLocation && (
          <div className="mt-1 text-xs text-muted">
            {item.location === "Unassigned" ? "No room" : `Rm ${item.location}`}
            {item.alsoLocation && ` / ${item.alsoLocation}`}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ItemList({ items, showLocation = true, empty = "Nothing here." }: { items: Item[]; showLocation?: boolean; empty?: string }) {
  if (items.length === 0) return <p className="px-4 py-6 text-sm text-muted">{empty}</p>;
  return (
    <div className="divide-y divide-line">
      {items.map((i) => (
        <ItemRow key={i.id} item={i} showLocation={showLocation} />
      ))}
    </div>
  );
}

export function SearchBox({ defaultValue = "", autoFocus = false, size = "md" }: { defaultValue?: string; autoFocus?: boolean; size?: "md" | "lg" }) {
  return (
    <form action="/search" className="flex gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder="Try “PE 151”, “beanbags”, “pennies” or “106A”"
        className={`min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 outline-none focus:border-brand ${size === "lg" ? "py-3 text-lg" : "py-2"}`}
      />
      <button className="rounded-lg bg-brand px-4 font-medium text-brand-ink">Search</button>
    </form>
  );
}
