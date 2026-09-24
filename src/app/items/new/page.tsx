import { getItems, getLocations } from "@/lib/db";
import { CONDITIONS } from "@/lib/types";
import { createItem } from "@/app/actions";
import { Card, PageTitle } from "@/components/ui";

export default async function NewItemPage() {
  const [locations, items] = await Promise.all([getLocations(), getItems()]);
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const input = "w-full rounded-md border border-line bg-bg px-3 py-2";
  return (
    <div>
      <PageTitle eyebrow="Inventory" title="Log a new delivery">
        Add equipment as it comes in so it shows up for the courses that need it.
      </PageTitle>
      <Card className="p-4">
        <form action={createItem} className="grid gap-3 text-sm sm:grid-cols-2">
          <label className="sm:col-span-2">Item name *<input name="name" required className={input} placeholder="e.g. Pickleball Paddle" /></label>
          <label>Make / brand<input name="make" className={input} /></label>
          <label>Model<input name="model" className={input} /></label>
          <label>Item / serial no.<input name="itemNo" className={input} /></label>
          <label>Color<input name="color" className={input} /></label>
          <label>Quantity<input name="qty" type="number" min={0} className={input} /></label>
          <label>Unit<input name="unit" defaultValue="Each" className={input} /></label>
          <label>Room
            <select name="location" className={input}>
              {locations.filter((l) => l.auditable).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </label>
          <label>Condition
            <select name="condition" defaultValue="New / Unissued" className={input}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Category
            <select name="category" className={input}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Delivered<input name="delivered" type="date" className={input} /></label>
          <label className="sm:col-span-2">
            Sports / tags <span className="text-muted">(comma separated, e.g. pickleball, class-org)</span>
            <input name="tags" className={input} />
          </label>
          <label className="sm:col-span-2">Notes<textarea name="notes" rows={2} className={input} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="controlled" /> Controlled item (admin sign-out only)</label>
          <button className="rounded-md bg-brand py-2 font-medium text-brand-ink sm:col-span-2">Add to inventory</button>
        </form>
      </Card>
    </div>
  );
}
