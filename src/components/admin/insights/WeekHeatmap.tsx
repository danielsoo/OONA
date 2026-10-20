"use client";

import ChartCard, { SimpleTable } from "@/components/admin/insights/ChartCard";
import { HEAT, HEAT_ZERO } from "@/components/admin/insights/palette";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";

/** A cell's color: nothing recedes into the surface, then five steps of one blue by share of the busiest hour. */
function heat(value: number, max: number): string {
  if (value <= 0 || max <= 0) return HEAT_ZERO;
  return HEAT[Math.min(HEAT.length - 1, Math.floor((value / max) * HEAT.length - 1e-9))]!;
}

/**
 * When people use the site: page views by weekday and hour of the day, in
 * the viewer's local time.
 */
export default function WeekHeatmap({ grid }: { grid: number[][] }) {
  const copy = useUiCopy();
  const { locale } = useTranslations();
  const max = Math.max(0, ...grid.flat());
  // 2026-10-19 is a Monday.
  const days = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 9, 19 + i)));
  const hour = (h: number) => new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(new Date(2026, 0, 1, h));

  return (
    <ChartCard
      title={copy("When people visit")}
      subtitle={copy("Page views by day and hour, your time")}
      table={<SimpleTable head={["", ...days]} rows={Array.from({ length: 24 }, (_, h) => [hour(h), ...grid.map((row) => row[h]!)])} />}
    >
      {/* One grid, each row its day's label then its 24 hours, so labels and cells stay lined up at any width. */}
      <div className="grid grid-cols-[auto_repeat(24,minmax(0,1fr))] items-center gap-[2px]">
        {grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="pr-1.5 text-[10px] leading-none text-[#898781]">{days[d]}</span>
            {row.map((value, h) => (
              <div
                key={h}
                title={`${days[d]} ${hour(h)}: ${value.toLocaleString()}`}
                aria-label={`${days[d]} ${hour(h)}: ${value.toLocaleString()}`}
                className="aspect-square rounded-[2px] transition hover:outline hover:outline-1 hover:outline-white/60"
                style={{ background: heat(value, max) }}
              />
            ))}
          </div>
        ))}
        <span />
        {[0, 6, 12, 18].map((h) => (
          <span key={h} className="col-span-6 pt-1 text-[10px] text-[#898781]">{hour(h)}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-[10px] text-[#898781]">
        {copy("Less")}
        {[HEAT_ZERO, ...HEAT].map((color) => <span key={color} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />)}
        {copy("More")}
      </div>
    </ChartCard>
  );
}
