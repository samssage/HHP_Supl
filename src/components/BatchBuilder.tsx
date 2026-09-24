"use client";

import { useMemo, useState } from "react";
import { Scanner } from "./Scanner";

export type PickItem = {
  id: string;
  name: string;
  color: string | null;
  location: string;
  available: number | null;
  codes: string[];
};

export type Line = { itemId: string | null; name: string; qty: number };

type Props = {
  items: PickItem[];
  initial?: Line[];
  /** Requests may include things we don't own yet ("juggling balls"). */
  allowFreeText?: boolean;
  /** Offer the camera to add items by scanning their labels. */
  allowScan?: boolean;
  /** Name of the hidden input that carries the lines as JSON. */
  field?: string;
};

export function matchCode(code: string, items: PickItem[]) {
  const c = code.trim().toUpperCase();
  const fromUrl = c.match(/\/ITEMS\/([A-Z0-9-]+)/)?.[1];
  return items.find((i) => i.id.toUpperCase() === (fromUrl ?? c) || i.codes.some((x) => x.toUpperCase() === c));
}

export function BatchBuilder({ items, initial = [], allowFreeText = false, allowScan = false, field = "lines" }: Props) {
  const [lines, setLines] = useState<Line[]>(initial);
  const [q, setQ] = useState("");
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return items
      .filter((i) => words.every((w) => `${i.name} ${i.color ?? ""} ${i.location} ${i.id}`.toLowerCase().includes(w)))
      .slice(0, 8);
  }, [q, items]);

  const add = (line: Line) =>
    setLines((ls) => {
      const existing = line.itemId && ls.find((l) => l.itemId === line.itemId);
      if (existing) return ls.map((l) => (l === existing ? { ...l, qty: l.qty + line.qty } : l));
      return [...ls, line];
    });
  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="space-y-3">
      <input type="hidden" name={field} value={JSON.stringify(lines)} />

      {lines.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {lines.map((l, idx) => {
            const item = l.itemId ? byId.get(l.itemId) : undefined;
            const over = item?.available !== null && item?.available !== undefined && l.qty > item.available;
            return (
              <li key={idx} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  <div className="text-sm font-medium">
                    {l.name}
                    {item?.color && <span className="font-normal text-muted"> · {item.color}</span>}
                  </div>
                  <div className={`text-xs ${over ? "font-semibold text-bad" : "text-muted"}`}>
                    {item
                      ? `Rm ${item.location} · ${item.available ?? "?"} available${over ? " — not enough on the shelf" : ""}`
                      : "Not in inventory — will need to be sourced"}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={l.qty}
                  onChange={(e) => {
                    const qty = Math.max(1, parseInt(e.target.value || "1", 10));
                    setLines((ls) => ls.map((x, i) => (i === idx ? { ...x, qty } : x)));
                  }}
                  aria-label={`Quantity of ${l.name}`}
                  className="w-16 rounded-md border border-line bg-bg px-2 py-1.5 text-center font-mono"
                />
                <button
                  type="button"
                  onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
                  className="rounded-md px-2 py-1 text-muted hover:text-bad"
                  aria-label={`Remove ${l.name}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) {
                add({ itemId: results[0].id, name: results[0].name, qty: 1 });
                setQ("");
              } else if (allowFreeText && q.trim()) {
                add({ itemId: null, name: q.trim(), qty: 1 });
                setQ("");
              }
            }
          }}
          placeholder={allowFreeText ? "Add equipment — search, or type anything we don’t have" : "Add equipment — start typing"}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5"
        />
        {q && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
            {results.map((i) => (
              <button
                type="button"
                key={i.id}
                onClick={() => {
                  add({ itemId: i.id, name: i.name, qty: 1 });
                  setQ("");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-chip"
              >
                <span className="flex-1">
                  {i.name}
                  {i.color && <span className="text-muted"> · {i.color}</span>}
                </span>
                <span className="text-xs text-muted">
                  Rm {i.location} · {i.available ?? "?"} avail.
                </span>
              </button>
            ))}
            {allowFreeText && (
              <button
                type="button"
                onClick={() => {
                  add({ itemId: null, name: q.trim(), qty: 1 });
                  setQ("");
                }}
                className="w-full border-t border-line px-3 py-2 text-left text-sm text-accent hover:bg-chip"
              >
                + Request “{q.trim()}” (not in inventory)
              </button>
            )}
            {!allowFreeText && results.length === 0 && <p className="px-3 py-2 text-sm text-muted">No match.</p>}
          </div>
        )}
      </div>

      {allowScan && (
        <>
          <Scanner
            continuous
            label="Scan items to add"
            onCode={(code) => {
              const hit = matchCode(code, items);
              if (hit) {
                add({ itemId: hit.id, name: hit.name, qty: 1 });
                setScanMsg(`Added ${hit.name}`);
              } else {
                setScanMsg(`Code ${code} isn’t linked to anything yet — link it from the item’s page.`);
              }
            }}
          />
          {scanMsg && <p className="text-sm text-muted">{scanMsg}</p>}
        </>
      )}
    </div>
  );
}
