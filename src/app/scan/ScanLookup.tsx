"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { attachCode, lookupCode } from "@/app/actions";
import { Scanner } from "@/components/Scanner";

export function ScanLookup({ items }: { items: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [unknown, setUnknown] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Scanner
        label="Start scanning"
        onCode={(code) =>
          start(async () => {
            const hit = await lookupCode(code);
            if (hit) router.push(`/items/${hit.id}`);
            else setUnknown(code);
          })
        }
      />
      {pending && <p className="text-sm text-muted">Looking it up…</p>}
      {unknown && (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <p>
            <span className="font-mono font-semibold">{unknown}</span> isn’t linked to anything yet.
          </p>
          <form action={attachCode} className="space-y-2">
            <input type="hidden" name="code" value={unknown} />
            <label className="block text-sm">
              It’s one of these — link the code to it:
              <input name="item" list="scan-items" placeholder="Start typing the item name" className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2" />
            </label>
            <datalist id="scan-items">
              {items.map((i) => <option key={i.id} value={i.label} />)}
            </datalist>
            <button className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink">Link code</button>
          </form>
          <p className="text-sm">
            Or it’s new:{" "}
            <Link href={`/items/new?barcode=${encodeURIComponent(unknown)}`} className="font-medium underline">
              log it as a new item
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
