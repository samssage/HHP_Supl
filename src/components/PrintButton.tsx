"use client";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="no-print rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:border-brand">
      {label}
    </button>
  );
}
