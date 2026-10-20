"use client";

import BarList from "@/components/admin/insights/BarList";
import ChartCard, { SimpleTable } from "@/components/admin/insights/ChartCard";
import { ACCENT } from "@/components/admin/insights/palette";
import { useUiCopy } from "@/components/i18n/UiText";
import type { ActivityInsights } from "@/types/activity-insights";

export const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** How far people get into videos, all together: of those who started, how many reached each mark. */
export function WatchFunnel({ funnel }: { funnel: ActivityInsights["funnel"] }) {
  const copy = useUiCopy();
  const steps = [
    { key: "plays", label: copy("Started"), value: funnel.plays },
    { key: "p25", label: copy("Reached 25%"), value: funnel.p25 },
    { key: "p50", label: copy("Reached 50%"), value: funnel.p50 },
    { key: "p75", label: copy("Reached 75%"), value: funnel.p75 },
    { key: "completes", label: copy("Finished"), value: funnel.completes },
  ];
  return (
    <ChartCard
      title={copy("How far people watch")}
      subtitle={copy("Of the plays started, how many reached each point")}
      table={<SimpleTable head={["", copy("Plays"), "%"]} rows={steps.map((s) => [s.label, s.value.toLocaleString(), `${percentOf(s.value, funnel.plays)}%`])} />}
    >
      <BarList
        items={steps.map((s) => ({ key: s.key, label: s.label, value: s.value, detail: `${percentOf(s.value, funnel.plays)}%` }))}
      />
    </ChartCard>
  );
}

/** Watch time as "3h 12m", "12m", "45s", in the viewer's language. */
export function formatWatchTime(seconds: number, locale: string): string {
  const unit = (value: number, u: "hour" | "minute" | "second") =>
    new Intl.NumberFormat(locale, { style: "unit", unit: u, unitDisplay: "narrow" }).format(value);
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${unit(h, "hour")} ${unit(m, "minute")}`;
  if (m > 0) return unit(m, "minute");
  return unit(s % 60, "second");
}

/** The most played videos: plays, how many finished (with a bar for the share), and time watched. */
export function TopVideos({ videos, locale }: { videos: ActivityInsights["videos"]; locale: string }) {
  const copy = useUiCopy();
  return (
    <ChartCard title={copy("Most watched videos")} subtitle={copy("By plays started")}>
      {videos.length === 0 ? (
        <p className="text-sm text-[#898781]">{copy("No videos played in this period.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-[#898781]">
                <th className="py-1.5 pr-3 font-medium">{copy("Video")}</th>
                <th className="py-1.5 pr-3 text-right font-medium">{copy("Plays")}</th>
                <th className="py-1.5 pr-3 font-medium">{copy("Finished")}</th>
                <th className="py-1.5 text-right font-medium">{copy("Watch time")}</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => {
                const rate = percentOf(video.completes, video.plays);
                return (
                  <tr key={video.title} className="border-b border-white/[0.05]">
                    <td className="max-w-[180px] truncate py-2 pr-3 text-white" title={video.title}>{video.title}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-[#c3c2b7]">{video.plays.toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-[4px] bg-[#1c5cab]/30">
                          <div className="h-full rounded-r-[4px]" style={{ width: `${rate}%`, background: ACCENT }} />
                        </div>
                        <span className="tabular-nums text-xs text-[#c3c2b7]">{rate}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-[#c3c2b7]">{formatWatchTime(video.watchedSeconds, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}
