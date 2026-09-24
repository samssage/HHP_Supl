import { currentStaff } from "@/lib/require-staff";
import Link from "next/link";
import { getItems, getLocations } from "@/lib/db";
import { searchItems } from "@/lib/search";
import { CONDITIONS } from "@/lib/types";
import { Card, ItemList, PageTitle } from "@/components/ui";

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ItemsPage({ searchParams }: PageProps<"/items">) {
  const staff = await currentStaff();
  const sp = await searchParams;
  const q = one(sp.q), cat = one(sp.category), loc = one(sp.location), cond = one(sp.condition);
  const [all, locations] = await Promise.all([getItems(), getLocations()]);
  const categories = [...new Set(all.map((i) => i.category))].sort();

  let items = q ? searchItems(q, all) : [...all].sort((a, b) => a.name.localeCompare(b.name));
  if (cat) items = items.filter((i) => i.category === cat);
  if (loc) items = items.filter((i) => i.location === loc);
  if (cond) items = items.filter((i) => i.condition === cond);

  const select = "rounded-md border border-line bg-surface px-2 py-2 text-sm";
  return (
    <div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <PageTitle eyebrow="By equipment" title="All equipment">
            {items.length} of {all.length} items
          </PageTitle>
        </div>
        {staff && <Link href="/items/new" className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink">
          + Log new delivery
        </Link>}
      </div>
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input name="q" defaultValue={q} placeholder="Filter by name, color, brand…" className="rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        <select name="category" defaultValue={cat} className={select}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="location" defaultValue={loc} className={select}>
          <option value="">All rooms</option>
          {locations.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <select name="condition" defaultValue={cond} className={select}>
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink">Filter</button>
      </form>
      <Card>
        <ItemList items={items} empty="No items match those filters." />
      </Card>
      <p className="mt-6 text-sm text-muted">
        Looking for something that’s gone? See the <Link href="/retired" className="underline">disposal log</Link>.
      </p>
    </div>
  );
}
