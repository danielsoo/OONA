"use client";

import { useUiCopy } from "@/components/i18n/UiText";
import { ACCENT, DELTA_DOWN, DELTA_UP, INK } from "@/components/admin/insights/palette";

/** A twelve-or-so-point trend: the earlier part in gray, the latest step in the accent. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const point = (v: number, i: number) => `${(i / (values.length - 1)) * 100},${22 - (v / max) * 20}`;
  const all = values.map(point);
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="mt-3 h-6 w-full" aria-hidden="true">
      <polyline points={all.slice(0, -1).join(" ")} fill="none" stroke={INK.muted} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <polyline points={all.slice(-2).join(" ")} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * One headline number: what it counts, the number, and how it compares with
 * the period before (▲/▼ and the percent, so it never rests on color).
 */
export default function StatTile({
  label,
  value,
  change,
  compare,
  spark,
}: {
  label: string;
  value: string;
  change: number | null;
  compare: string;
  spark?: number[];
}) {
  const copy = useUiCopy();
  const direction = change === null || change === 0 ? 0 : change > 0 ? 1 : -1;
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-xiio-surface p-4">
      <p className="truncate text-xs text-[#c3c2b7]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-snug">
        <span style={{ color: direction > 0 ? DELTA_UP : direction < 0 ? DELTA_DOWN : INK.muted }}>
          {change === null ? copy("New") : `${direction > 0 ? "▲" : direction < 0 ? "▼" : "–"} ${Math.abs(change)}%`}
        </span>{" "}
        <span className="text-[#898781]">{compare}</span>
      </p>
      {spark ? <Sparkline values={spark} /> : null}
    </div>
  );
}
