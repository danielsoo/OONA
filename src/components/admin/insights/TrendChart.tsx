"use client";

import { useState } from "react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard, { SimpleTable } from "@/components/admin/insights/ChartCard";
import { ACCENT, INK, SURFACE } from "@/components/admin/insights/palette";
import { useUiCopy } from "@/components/i18n/UiText";
import type { InsightsSeries } from "@/types/activity-insights";

export type TrendPoint = { label: string } & Record<InsightsSeries, number>;

/**
 * One measure over time, picked from the five: a single line with a light
 * wash under it, a hairline that follows the pointer, and the number at
 * that time in the readout. The last hour or day is still under way, so its
 * stretch of line is dashed rather than read as a fall.
 */
export default function TrendChart({ points, subtitle, partialNote }: { points: TrendPoint[]; subtitle: string; partialNote: string }) {
  const copy = useUiCopy();
  const metrics: { id: InsightsSeries; label: string }[] = [
    { id: "pageViews", label: copy("Page views") },
    { id: "visits", label: copy("Visits") },
    { id: "searches", label: copy("Searches") },
    { id: "plays", label: copy("Video plays") },
    { id: "signIns", label: copy("Sign-ins") },
  ];
  const [metric, setMetric] = useState<InsightsSeries>("pageViews");
  const current = metrics.find((m) => m.id === metric)!;
  const last = points.length - 1;
  const data = points.map((point, i) => ({
    label: point.label,
    done: i < last ? point[metric] : null,
    sofar: i >= last - 1 ? point[metric] : null,
    value: point[metric],
    partial: i === last,
  }));

  return (
    <ChartCard
      title={copy("Activity over time")}
      subtitle={subtitle}
      action={
        <div className="flex flex-wrap gap-1" role="group" aria-label={copy("Measure")}>
          {metrics.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={metric === m.id}
              onClick={() => setMetric(m.id)}
              className={`rounded-md px-2 py-1 text-[11px] transition ${metric === m.id ? "bg-white text-black" : "text-[#c3c2b7] hover:bg-white/5"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
      table={<SimpleTable head={["", current.label]} rows={points.map((p) => [p.label, p[metric].toLocaleString()])} />}
    >
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={INK.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: INK.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: INK.baseline }} minTickGap={24} />
            <YAxis tick={{ fill: INK.muted, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
            <Tooltip
              cursor={{ stroke: INK.muted, strokeWidth: 1 }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-white/15 bg-[#111114] px-3 py-2 text-xs shadow-lg">
                    <p className="text-sm font-semibold text-white">{Number(payload[0]!.payload.value).toLocaleString()}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[#c3c2b7]">
                      <span className="inline-block h-0.5 w-3 rounded" style={{ background: ACCENT }} aria-hidden />
                      {current.label} · {label}
                      {payload[0]!.payload.partial ? ` · ${copy("so far")}` : ""}
                    </p>
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="done"
              stroke={ACCENT}
              strokeWidth={2}
              fill={ACCENT}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, fill: ACCENT, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="sofar"
              stroke={ACCENT}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, fill: ACCENT, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-[#898781]">{partialNote}</p>
    </ChartCard>
  );
}
