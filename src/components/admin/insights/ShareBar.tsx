"use client";

import { SERIES } from "@/components/admin/insights/palette";

type Part = { key: string; label: string; value: number };

/**
 * Parts of a whole as one bar (three parts at most, each its own color, a
 * 2px gap between; past three, the smallest fold into "Other"), with a
 * legend that names each and gives its count and share.
 */
export default function ShareBar({ parts, otherLabel }: { parts: Part[]; otherLabel: string }) {
  const sorted = [...parts].sort((a, b) => b.value - a.value);
  const shown: Part[] =
    sorted.length <= SERIES.length
      ? sorted
      : [...sorted.slice(0, SERIES.length - 1), { key: "other", label: otherLabel, value: sorted.slice(SERIES.length - 1).reduce((sum, part) => sum + part.value, 0) }];
  const total = shown.reduce((sum, part) => sum + part.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-[4px]">
        {shown.map((part, i) => (
          <div
            key={part.key}
            title={`${part.label}: ${part.value.toLocaleString()} (${Math.round((part.value / total) * 100)}%)`}
            className="h-full transition hover:brightness-125"
            style={{ width: `${(part.value / total) * 100}%`, background: SERIES[i] }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {shown.map((part, i) => (
          <li key={part.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-white">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SERIES[i] }} aria-hidden />
              {part.label}
            </span>
            <span className="tabular-nums text-[#c3c2b7]">
              {part.value.toLocaleString()} <span className="text-[#898781]">· {Math.round((part.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
