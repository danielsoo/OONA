"use client";

import { useEffect, useMemo, useState } from "react";
import BarList from "@/components/admin/insights/BarList";
import ChartCard from "@/components/admin/insights/ChartCard";
import { AREA_NAMES, DEVICE_NAMES, pageName } from "@/components/admin/insights/names";
import ShareBar from "@/components/admin/insights/ShareBar";
import StatTile from "@/components/admin/insights/StatTile";
import TrendChart, { type TrendPoint } from "@/components/admin/insights/TrendChart";
import { formatWatchTime, TopVideos, WatchFunnel } from "@/components/admin/insights/VideoInsights";
import WeekHeatmap from "@/components/admin/insights/WeekHeatmap";
import { useUiCopy } from "@/components/i18n/UiText";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { granularityOf, localBuckets, percentChange, regroup, weekHourGrid } from "@/lib/activity/insights-buckets";
import type { ActivityInsights, InsightsRange, InsightsSeries } from "@/types/activity-insights";

const SERIES: InsightsSeries[] = ["pageViews", "visits", "searches", "plays", "signIns"];

/**
 * The activity log as charts (lib/server/activity/insights.ts): headline
 * numbers against the period before, activity over time, when people come,
 * what they open, search for and watch, and on what. One period picker
 * above everything; changing it keeps the charts in place while the new
 * numbers load.
 */
export default function AdminActivityInsights() {
  const { user } = useAuth();
  const { locale } = useTranslations();
  const copy = useUiCopy();
  const [range, setRange] = useState<InsightsRange>("7d");
  const [data, setData] = useState<ActivityInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/activity/insights?range=${range}`, {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        const body = (await res.json().catch(() => ({}))) as ActivityInsights & { notConfigured?: boolean; message?: string };
        if (cancelled) return;
        if (!res.ok) setNotice(body.message ?? copy("Couldn't load the charts."));
        else if (body.notConfigured) setNotice(copy("The activity log isn't connected to its database yet: set MONGODB_URI on the server."));
        else {
          setNotice(null);
          setData(body);
        }
      } catch {
        if (!cancelled) setNotice(copy("Couldn't load the charts."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, range, copy]);

  const view = useMemo(() => {
    if (!data) return null;
    const granularity = granularityOf(data.range);
    const buckets = localBuckets(data.from, data.to, granularity);
    const label = new Intl.DateTimeFormat(locale, granularity === "hour" ? { hour: "numeric" } : { month: "short", day: "numeric" });
    const values = Object.fromEntries(SERIES.map((s) => [s, regroup(data.hourly[s], buckets, granularity)])) as Record<InsightsSeries, number[]>;
    const points: TrendPoint[] = buckets.map((bucket, i) => ({
      label: label.format(bucket.start),
      ...(Object.fromEntries(SERIES.map((s) => [s, values[s][i]!])) as Record<InsightsSeries, number>),
    }));
    return { points, values, grid: weekHourGrid(data.hourly.pageViews) };
  }, [data, locale]);

  const ranges: { id: InsightsRange; label: string; compare: string }[] = [
    { id: "24h", label: copy("Last 24 hours"), compare: copy("vs the 24 hours before") },
    { id: "7d", label: copy("Last 7 days"), compare: copy("vs the 7 days before") },
    { id: "30d", label: copy("Last 30 days"), compare: copy("vs the 30 days before") },
    { id: "90d", label: copy("Last 90 days"), compare: copy("vs the 90 days before") },
  ];
  const compare = ranges.find((r) => r.id === range)!.compare;
  const compact = (n: number) => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const regions = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames([locale], { type: "region" }) : null;
  const country = (code: string) => {
    if (code === "unknown") return copy("Unknown");
    try {
      return regions?.of(code) ?? code;
    } catch {
      return code;
    }
  };

  const t = data?.totals;
  const p = data?.previous;
  const empty = t ? Object.values(t).every((n) => n === 0) : false;

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={copy("Period")}>
        {ranges.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${range === r.id ? "bg-white font-semibold text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
          >
            {range === r.id ? "✓ " : ""}
            {r.label}
          </button>
        ))}
      </div>

      {notice ? <p className="mb-4 text-sm text-amber-300/90">{notice}</p> : null}
      {!data && loading ? <p className="text-sm text-xiio-muted">{copy("Loading…")}</p> : null}

      {data && t && p && view ? (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {empty ? <p className="rounded-xl border border-white/10 bg-xiio-surface p-4 text-sm text-[#c3c2b7]">{copy("Nothing recorded in this period yet.")}</p> : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={copy("Visitors")} value={compact(t.visitors)} change={percentChange(t.visitors, p.visitors)} compare={compare} />
            <StatTile label={copy("Signed-in people")} value={compact(t.members)} change={percentChange(t.members, p.members)} compare={compare} />
            <StatTile label={copy("Visits")} value={compact(t.visits)} change={percentChange(t.visits, p.visits)} compare={compare} spark={view.values.visits} />
            <StatTile label={copy("Page views")} value={compact(t.pageViews)} change={percentChange(t.pageViews, p.pageViews)} compare={compare} spark={view.values.pageViews} />
            <StatTile label={copy("Searches")} value={compact(t.searches)} change={percentChange(t.searches, p.searches)} compare={compare} spark={view.values.searches} />
            <StatTile label={copy("Video plays")} value={compact(t.plays)} change={percentChange(t.plays, p.plays)} compare={compare} spark={view.values.plays} />
            <StatTile label={copy("Watch time")} value={formatWatchTime(t.watchedSeconds, locale)} change={percentChange(t.watchedSeconds, p.watchedSeconds)} compare={compare} />
            <StatTile label={copy("Sign-ups")} value={compact(t.signUps)} change={percentChange(t.signUps, p.signUps)} compare={compare} />
          </div>

          <TrendChart
            points={view.points}
            subtitle={granularityOf(data.range) === "hour" ? copy("By hour, your time") : copy("By day, your time")}
            partialNote={granularityOf(data.range) === "hour" ? copy("Dashed: this hour, still counting.") : copy("Dashed: today, still counting.")}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <WeekHeatmap grid={view.grid} />
            <ChartCard title={copy("Where people spend time")} subtitle={copy("Page views by part of the site")}>
              <BarList items={data.areas.map((a) => ({ key: a.name, label: copy(AREA_NAMES[a.name] ?? a.name), value: a.views }))} />
            </ChartCard>

            <ChartCard title={copy("Most viewed pages")} subtitle={copy("Page views")}>
              {data.topPages.length === 0 ? (
                <p className="text-sm text-[#898781]">{copy("Nothing recorded in this period yet.")}</p>
              ) : (
                <BarList
                  items={data.topPages.map((page) => {
                    const name = pageName(page.path) ? copy(pageName(page.path)!) : null;
                    // The heading only when it says more than the page's name ("Films: Films" says it twice).
                    const heading = page.heading && page.heading.toLowerCase() !== name?.toLowerCase() ? page.heading : null;
                    const label = name && heading ? `${name}: ${heading}` : name ?? heading ?? page.path;
                    return { key: page.path, label, detail: page.path, value: page.views, href: page.path };
                  })}
                />
              )}
            </ChartCard>
            <ChartCard title={copy("Top searches")} subtitle={copy("What people typed into search boxes")}>
              {data.topSearches.length === 0 ? (
                <p className="text-sm text-[#898781]">{copy("No searches in this period.")}</p>
              ) : (
                <BarList items={data.topSearches.map((s) => ({ key: s.query, label: `“${s.query}”`, value: s.count }))} />
              )}
            </ChartCard>

            <WatchFunnel funnel={data.funnel} />
            <TopVideos videos={data.videos} locale={locale} />

            <ChartCard title={copy("Devices")} subtitle={copy("Visits by device")}>
              {data.devices.length === 0 ? (
                <p className="text-sm text-[#898781]">{copy("Nothing recorded in this period yet.")}</p>
              ) : (
                <ShareBar
                  otherLabel={copy("Other")}
                  parts={data.devices.map((d) => ({ key: d.name, label: copy(DEVICE_NAMES[d.name] ?? d.name), value: d.visits }))}
                />
              )}
            </ChartCard>
            <ChartCard title={copy("Countries")} subtitle={copy("Visits by country")}>
              {data.countries.length === 0 ? (
                <p className="text-sm text-[#898781]">{copy("Nothing recorded in this period yet.")}</p>
              ) : (
                <BarList items={data.countries.map((c) => ({ key: c.name, label: country(c.name), value: c.visits }))} />
              )}
            </ChartCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
