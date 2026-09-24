"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAudit } from "@/app/actions";
import { CONDITIONS } from "@/lib/types";

type Row = {
  id: string;
  name: string;
  color: string | null;
  detail: string;
  expected: number | null;
  unit: string;
  category: string;
  condition: string;
};

type Extra = { key: number; name: string; counted: string };

const NAME_KEY = "hhp-auditor-name";

export function AuditForm({ location, items }: { location: string; items: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Extra[]>([]);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      // Hydrate the browser-only saved name after the server-rendered form mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setName(saved);
    } catch {}
  }, []);

  const countedN = Object.values(counts).filter((v) => v !== "").length;
  const visible = useMemo(() => {
    const f = filter.toLowerCase();
    return f ? items.filter((i) => `${i.name} ${i.color ?? ""} ${i.detail}`.toLowerCase().includes(f)) : items;
  }, [filter, items]);
  const categories = [...new Set(visible.map((i) => i.category))];

  const set = (id: string, v: string) => setCounts((c) => ({ ...c, [id]: v }));
  const bump = (row: Row, d: number) => {
    const cur = counts[row.id] === undefined || counts[row.id] === "" ? row.expected ?? 0 : parseInt(counts[row.id], 10);
    set(row.id, String(Math.max(0, cur + d)));
  };

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Enter your name at the top so we know who counted.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (countedN === 0 && extras.every((e) => !e.name.trim())) {
      setError("Count at least one item before submitting.");
      return;
    }
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {}
    const lines = [
      ...items.map((i) => ({
        itemId: i.id,
        name: i.name,
        counted: counts[i.id] !== undefined && counts[i.id] !== "" ? parseInt(counts[i.id], 10) : null,
        condition: conditions[i.id] || null,
        note: null,
      })),
      ...extras
        .filter((e) => e.name.trim())
        .map((e) => ({ itemId: null, name: e.name, counted: e.counted ? parseInt(e.counted, 10) : null, condition: null, note: null })),
    ];
    start(async () => {
      try {
        const id = await submitAudit({ location, performedBy: name, notes: notes.trim() || null, lines });
        router.push(`/audits/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong saving the count.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-lg border border-line bg-surface px-3 py-2.5"
        />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Find in this room (${items.length} items)`}
          className="rounded-lg border border-line bg-surface px-3 py-2.5"
        />
      </div>

      {categories.map((cat) => (
        <section key={cat} className="rounded-lg border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-2 text-sm font-semibold">{cat}</h2>
          <ul className="divide-y divide-line">
            {visible
              .filter((i) => i.category === cat)
              .map((row) => {
                const v = counts[row.id] ?? "";
                const n = v === "" ? null : parseInt(v, 10);
                const tone =
                  n === null ? "" : row.expected === null || n === row.expected ? "bg-good-bg" : n < row.expected ? "bg-warn-bg" : "bg-chip";
                return (
                  <li key={row.id} className={`px-4 py-3 ${tone}`}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium [overflow-wrap:anywhere]">
                          {row.name}
                          {row.color && <span className="font-normal text-muted"> · {row.color}</span>}
                        </div>
                        <div className="text-xs text-muted">
                          {row.detail && `${row.detail} · `}
                          Expected <span className="font-mono font-semibold">{row.expected ?? "?"}</span> {row.unit}
                          {n !== null && row.expected !== null && n !== row.expected && (
                            <span className={n < row.expected ? "ml-1 font-semibold text-warn" : "ml-1 font-semibold"}>
                              ({n > row.expected ? "+" : ""}
                              {n - row.expected})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => bump(row, -1)} className="h-9 w-9 rounded-md border border-line bg-surface text-lg" aria-label="One fewer">−</button>
                        <input
                          value={v}
                          onChange={(e) => set(row.id, e.target.value.replace(/\D/g, ""))}
                          inputMode="numeric"
                          placeholder="—"
                          aria-label={`Count for ${row.name}`}
                          className="h-9 w-14 rounded-md border border-line bg-surface text-center font-mono"
                        />
                        <button type="button" onClick={() => bump(row, 1)} className="h-9 w-9 rounded-md border border-line bg-surface text-lg" aria-label="One more">+</button>
                        {row.expected !== null && (
                          <button
                            type="button"
                            onClick={() => set(row.id, String(row.expected))}
                            className="h-9 rounded-md bg-good px-2.5 text-sm font-semibold text-white"
                            aria-label="Matches expected"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                    {n !== null && (
                      <select
                        value={conditions[row.id] ?? ""}
                        onChange={(e) => setConditions((c) => ({ ...c, [row.id]: e.target.value }))}
                        className="mt-2 rounded-md border border-line bg-surface px-2 py-1 text-xs"
                      >
                        <option value="">Condition: {row.condition === "To Verify" ? "Good (default)" : `${row.condition} (unchanged)`}</option>
                        {CONDITIONS.filter((c) => c !== "To Verify").map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-semibold">Found something not on the list?</h2>
        <p className="text-sm text-muted">Add it here and it’ll be logged in this room for review.</p>
        <div className="mt-3 space-y-2">
          {extras.map((e) => (
            <div key={e.key} className="flex gap-2">
              <input
                value={e.name}
                onChange={(ev) => setExtras((xs) => xs.map((x) => (x.key === e.key ? { ...x, name: ev.target.value } : x)))}
                placeholder="What is it?"
                className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2"
              />
              <input
                value={e.counted}
                onChange={(ev) => setExtras((xs) => xs.map((x) => (x.key === e.key ? { ...x, counted: ev.target.value.replace(/\D/g, "") } : x)))}
                inputMode="numeric"
                placeholder="Qty"
                className="w-16 rounded-md border border-line bg-bg px-2 py-2 text-center"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExtras((xs) => [...xs, { key: Date.now(), name: "", counted: "" }])}
            className="rounded-md border border-dashed border-line px-3 py-1.5 text-sm hover:border-brand"
          >
            + Add item
          </button>
        </div>
      </section>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes for this count (optional) — e.g. ‘top shelf blocked’"
        rows={2}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2"
      />

      {error && <p className="rounded-md bg-bad-bg px-3 py-2 text-sm text-bad">{error}</p>}

      <div className="sticky bottom-16 z-10 flex items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-lg md:bottom-4">
        <span className="flex-1 text-sm">
          <strong className="tabular-nums">{countedN}</strong> of {items.length} counted
        </span>
        <button onClick={submit} disabled={pending} className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Submit count"}
        </button>
      </div>
    </div>
  );
}
