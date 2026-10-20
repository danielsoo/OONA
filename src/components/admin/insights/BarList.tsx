"use client";

import { ACCENT } from "@/components/admin/insights/palette";

export type BarItem = { key: string; label: string; detail?: string | null; value: number; href?: string };

/**
 * A ranked list with a bar for each: the label and its number on one line,
 * the bar under it, all in one color (one series, compared by length).
 */
export default function BarList({ items, format = (n) => n.toLocaleString() }: { items: BarItem[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.key} className="group" title={`${item.label}${item.detail ? ` — ${item.detail}` : ""}: ${format(item.value)}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {item.href ? (
                <a href={item.href} target="_blank" rel="noreferrer" className="text-white hover:underline">{item.label}</a>
              ) : (
                <span className="text-white">{item.label}</span>
              )}
              {item.detail ? <span className="ml-2 text-xs text-[#898781]">{item.detail}</span> : null}
            </span>
            <span className="shrink-0 tabular-nums text-[#c3c2b7]">{format(item.value)}</span>
          </div>
          <div
            className="mt-1.5 h-2 rounded-r-[4px] transition group-hover:brightness-125"
            style={{ width: `${Math.max(1, (item.value / max) * 100)}%`, background: ACCENT }}
          />
        </li>
      ))}
    </ol>
  );
}
