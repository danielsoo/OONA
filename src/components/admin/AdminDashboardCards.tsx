"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminOperationsAnalytics } from "@/hooks/useAdminOperationsAnalytics";
import type {
  AdminAnalyticsMetric,
  AdminAnalyticsRange,
} from "@/types/admin-analytics";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";
import { useTranslations } from "@/context/LocaleContext";

const RANGES: Array<{ value: AdminAnalyticsRange; label: string }> = [
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

const RESOLUTION_COLORS = ["#315fb5", "#3D7DFF", "#74a5ff", "#abc8ff", "#5d6470"];
const SURFACE = "rounded-2xl border border-white/10 bg-xiio-surface/90";

function formatCompact(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits,
  }).format(value);
}

function formatMoney(value: number | null): string {
  if (value == null) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBytes(value: number): string {
  if (value <= 0) return "0 GB";
  const gb = value / 1024 / 1024 / 1024;
  return `${gb >= 100 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
}

function changeLabel(metric: AdminAnalyticsMetric): { text: string; positive: boolean | null } {
  if (metric.changePercent == null) return { text: "No prior-period data", positive: null };
  const positive = metric.changePercent >= 0;
  return {
    text: `${positive ? "+" : ""}${metric.changePercent.toFixed(1)}% vs previous period`,
    positive,
  };
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 26 - ((value - min) / range) * 22;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#3D7DFF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MetricCard({
  label,
  value,
  metric,
  values,
  note,
}: {
  label: string;
  value: string;
  metric?: AdminAnalyticsMetric;
  values: number[];
  note?: string;
}) {
  const change = metric ? changeLabel(metric) : null;
  return (
    <article className={`${SURFACE} min-w-0 p-4 xl:p-5`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-white xl:text-[2rem]">{value}</p>
      <p
        className={`mt-1 min-h-4 truncate text-[10px] ${
          change?.positive === true
            ? "text-xiio-accent"
            : change?.positive === false
              ? "text-red-400"
              : "text-white/35"
        }`}
      >
        {note ?? change?.text ?? "Current playback sessions"}
      </p>
      <div className="mt-2 opacity-90"><Sparkline values={values} /></div>
    </article>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-52 items-center justify-center text-center text-sm text-white/35">
      {text}
    </div>
  );
}

function LoadingDashboard() {
  const _copy = useUiCopy();
  return (
    <div className="animate-pulse space-y-4" aria-label={_copy("Loading operations analytics")}>
      <div className="h-20 rounded-2xl bg-white/[0.04]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="h-80 rounded-2xl bg-white/[0.04]" />
        <div className="h-80 rounded-2xl bg-white/[0.04]" />
      </div>
      <div className="h-72 rounded-2xl bg-white/[0.04]" />
    </div>
  );
}

export default function AdminDashboardCards() {
  const { locale } = useTranslations();
  const _copy = useUiCopy();
  const [range, setRange] = useState<AdminAnalyticsRange>("24h");
  const [chartMetric, setChartMetric] = useState<"viewers" | "watchMinutes">("viewers");
  const { data, loading, refreshing, error, refresh } = useAdminOperationsAnalytics(range);

  const sparkValues = useMemo(() => {
    if (!data) return { viewers: [0], watch: [0], visits: [0] };
    return {
      viewers: data.streaming.map((point) => point.viewers),
      watch: data.streaming.map((point) => point.watchMinutes),
      visits: data.streaming.map((point) => point.visits),
    };
  }, [data]);

  if (loading && !data) return <LoadingDashboard />;

  if (!data) {
    return (
      <div className={`${SURFACE} flex min-h-80 flex-col items-center justify-center gap-4 p-8 text-center`}>
        <p className="text-lg font-semibold text-white"><UiText text={"Operations analytics could not be loaded."} /></p>
        <p className="max-w-lg text-sm text-xiio-muted">{error ?? "Check the Firestore and admin configuration."}</p>
        <button
          type="button"
          onClick={() => void refresh(false)}
          className="rounded-lg bg-xiio-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-xiio-accent-hover"
        ><UiText text={"Try again"} /></button>
      </div>
    );
  }

  const hasStreamingData = data.streaming.some(
    (point) => point.viewers > 0 || point.watchMinutes > 0 || point.visits > 0
  );
  const hasResolutionData = data.resolutionMix.some((item) => item.seconds > 0);
  const deliverySourceLabel =
    data.kpis.deliveryCostUsd.source === "cloudflare"
      ? "Cloudflare delivery"
      : data.kpis.deliveryCostUsd.source === "playback_telemetry"
        ? "Telemetry estimate"
        : "Awaiting delivery data";

  const exportCsv = () => {
    const rows = [
      ["metric", "value", "previous_period"],
      ["live_viewers", data.kpis.liveViewers, ""],
      ["watch_minutes", data.kpis.watchMinutes.value, data.kpis.watchMinutes.previousValue],
      ["visits", data.kpis.visits.value, data.kpis.visits.previousValue],
      ["uploads", data.kpis.uploads.value, data.kpis.uploads.previousValue],
      ["delivery_cost_usd", data.kpis.deliveryCostUsd.value, data.kpis.deliveryCostUsd.previousValue],
      [],
      ["content", "live_viewers", "views", "watch_minutes", "completion_percent", "delivery_minutes"],
      ...data.topContent.map((item) => [
        item.title,
        item.liveViewers,
        item.views,
        item.watchMinutes,
        item.completionPercent ?? "",
        item.deliveryMinutes ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xiio-operations-${range}-${data.generatedAt.slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-6">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-xiio-accent"><UiText text={"Operations"} /></p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl"><UiText text={"Operations Overview"} /></h1>
          <p className="mt-2 text-sm text-xiio-muted"><UiText text={"Live platform activity, content throughput, and delivery cost."} /></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-medium text-white/80 transition hover:border-white/30 hover:text-white"
            title={_copy("Refresh analytics")}
          >
            <span className={`h-2 w-2 rounded-full bg-emerald-400 ${refreshing ? "animate-pulse" : ""}`} /><UiText text={"Live"} /></button>
          <div className="flex h-10 overflow-hidden rounded-lg border border-white/15">
            {RANGES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setRange(item.value)}
                className={`min-w-14 border-l border-white/10 px-3 text-xs font-semibold transition first:border-l-0 ${
                  range === item.value ? "bg-xiio-accent/20 text-white ring-1 ring-inset ring-xiio-accent" : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="h-10 rounded-lg border border-white/20 px-4 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
          ><UiText text={"Export CSV"} /></button>
        </div>
      </header>

      {error ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200">
          <span><UiText text={"Showing the latest available snapshot. Refresh failed:"} />{" "}{error}</span>
          <button type="button" onClick={() => void refresh(true)} className="shrink-0 font-semibold underline underline-offset-4"><UiText text={"Retry"} /></button>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label={_copy("Live viewers")}
          value={formatCompact(data.kpis.liveViewers, 0)}
          values={sparkValues.viewers}
          note="Active in the last 45 seconds"
        />
        <MetricCard
          label={_copy("Watch time")}
          value={`${formatCompact(data.kpis.watchMinutes.value)} min`}
          metric={data.kpis.watchMinutes}
          values={sparkValues.watch}
        />
        <MetricCard
          label={_copy("Traffic")}
          value={`${formatCompact(data.kpis.visits.value)} visits`}
          metric={data.kpis.visits}
          values={sparkValues.visits}
        />
        <MetricCard
          label={_copy("Video uploads")}
          value={formatCompact(data.kpis.uploads.value, 0)}
          metric={data.kpis.uploads}
          values={data.streaming.map(() => data.kpis.uploads.value)}
        />
        <MetricCard
          label={_copy("Delivery cost")}
          value={
            data.kpis.deliveryCostUsd.source === "unavailable"
              ? "Not available"
              : formatMoney(data.kpis.deliveryCostUsd.value)
          }
          metric={data.kpis.deliveryCostUsd}
          values={sparkValues.watch}
          note={deliverySourceLabel}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <article className={`${SURFACE} min-h-[330px] p-4 xl:p-5`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-white"><UiText text={"Streaming activity"} /></h2>
            <div className="flex rounded-lg border border-white/10 p-0.5 text-[11px]">
              {(["viewers", "watchMinutes"] as const).map((metric) => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setChartMetric(metric)}
                  className={`rounded-md px-3 py-1.5 transition ${chartMetric === metric ? "bg-xiio-accent/20 text-white ring-1 ring-inset ring-xiio-accent/70" : "text-white/45 hover:text-white"}`}
                >
                  {metric === "viewers" ? _copy("View events") : _copy("Watch minutes")}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 h-[250px]">
            {hasStreamingData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.streaming} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="streamingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3D7DFF" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3D7DFF" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" stroke="rgba(255,255,255,0.28)" tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis stroke="rgba(255,255,255,0.28)" tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#111114", border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: "rgba(255,255,255,.55)" }}
                    formatter={(value) => [
                      chartMetric === "watchMinutes" ? `${Number(value ?? 0).toFixed(1)} min` : formatCompact(Number(value ?? 0), 0),
                      chartMetric === "watchMinutes" ? "Watch time" : "View events",
                    ]}
                  />
                  <Area type="monotone" dataKey={chartMetric} stroke="#3D7DFF" strokeWidth={2} fill="url(#streamingFill)" activeDot={{ r: 4, fill: "#fff", stroke: "#3D7DFF", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="Activity will appear as visits and playback events are recorded." />
            )}
          </div>
        </article>

        <article className={`${SURFACE} min-h-[330px] p-4 xl:p-5`}>
          <h2 className="text-base font-semibold text-white"><UiText text={"Resolution delivery mix"} /></h2>
          {hasResolutionData ? (
            <div className="mt-4 grid h-[245px] grid-cols-[minmax(140px,1fr)_1fr] items-center gap-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.resolutionMix} dataKey="seconds" innerRadius="52%" outerRadius="78%" paddingAngle={1} stroke="none">
                    {data.resolutionMix.map((item, index) => <Cell key={item.label} fill={RESOLUTION_COLORS[index]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111114", border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, fontSize: 12 }}
                    formatter={(value) => [`${(Number(value ?? 0) / 60).toFixed(1)} min`, "Watch time"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {data.resolutionMix.map((item, index) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RESOLUTION_COLORS[index] }} />
                    <span className="text-white/65">{item.label}</span>
                    <span className="ml-auto font-medium tabular-nums text-white">{item.percent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart text="Resolution data begins collecting during HLS playback." />
          )}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className={`${SURFACE} p-4 xl:p-5`}>
          <h2 className="text-base font-semibold text-white"><UiText text={"Upload pipeline"} /></h2>
          <div className="mt-5 grid grid-cols-5 gap-2 text-center">
            {[
              ["New", data.uploadPipeline.new],
              ["Processing", data.uploadPipeline.processing],
              ["In review", data.uploadPipeline.inReview],
              ["Ready", data.uploadPipeline.ready],
              ["Failed", data.uploadPipeline.failed],
            ].map(([label, value], index) => (
              <div key={String(label)} className="min-w-0">
                <p className="truncate text-[10px] text-white/45">{label}</p>
                <p className={`mt-2 text-xl font-semibold tabular-nums ${index === 4 && Number(value) > 0 ? "text-red-400" : "text-white"}`}>{value}</p>
                <div className={`mx-auto mt-4 h-3 w-3 rounded-full border-2 ${index === 4 && Number(value) > 0 ? "border-red-400" : "border-xiio-accent"}`} />
              </div>
            ))}
          </div>
          <div className="relative mx-[10%] -mt-[7px] h-px bg-white/15" aria-hidden="true" />
          <Link href="/admin/content" className="mt-6 inline-block text-xs font-medium text-xiio-accent hover:underline"><UiText text={"Open content review →"} /></Link>
        </article>

        <article className={`${SURFACE} p-4 xl:p-5`}>
          <h2 className="text-base font-semibold text-white"><UiText text={"Traffic sources"} /></h2>
          <div className="mt-4 space-y-3">
            {data.trafficSources.map((source) => (
              <div key={source.key} className="grid grid-cols-[70px_1fr_42px] items-center gap-3 text-xs">
                <span className="text-white/60">{source.label}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-xiio-accent" style={{ width: `${Math.max(0, Math.min(100, source.percent))}%` }} />
                </div>
                <span className="text-right tabular-nums text-white">{source.percent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[10px] text-white/30"><UiText text={"One acquisition source per browser session."} /></p>
        </article>

        <article className={`${SURFACE} p-4 xl:p-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white"><UiText text={"Cost overview"} /></h2>
            <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/40"><UiText text={"Estimated"} /></span>
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between gap-4"><dt className="text-white/55"><UiText text={"Source storage ·"} />{" "}{formatBytes(data.costs.sourceStorageBytes)}</dt><dd className="tabular-nums text-white">{formatMoney(data.costs.sourceStorageCostUsd)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/55"><UiText text={"Stream storage ·"} />{" "}{formatCompact(data.costs.streamStorageMinutes)}{" "}<UiText text={"min"} /></dt><dd className="tabular-nums text-white">{formatMoney(data.costs.streamStorageCostUsd)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/55"><UiText text={"Stream delivery ·"} />{" "}{data.costs.streamDeliveryMinutes == null ? "—" : `${formatCompact(data.costs.streamDeliveryMinutes)} min`}</dt><dd className="tabular-nums text-white">{formatMoney(data.costs.streamDeliveryCostUsd)}</dd></div>
            <div className="mt-3 flex justify-between gap-4 border-t border-white/10 pt-3 text-sm"><dt className="font-medium text-white"><UiText text={"Monthly forecast"} /></dt><dd className="font-semibold tabular-nums text-white">{formatMoney(data.costs.monthlyForecastUsd)}</dd></div>
          </dl>
          <p className={`mt-3 text-[10px] ${data.costs.forecastWithinBudget === false ? "text-red-400" : data.costs.forecastWithinBudget === true ? "text-emerald-400" : "text-white/35"}`}>
            {data.costs.forecastWithinBudget == null
              ? _copy("Set XIIO_MONTHLY_VIDEO_BUDGET_USD to enable budget alerts.")
              : data.costs.forecastWithinBudget
                ? `Within the ${formatMoney(data.costs.monthlyBudgetUsd)} budget`
                : `Above the ${formatMoney(data.costs.monthlyBudgetUsd)} budget`}
          </p>
        </article>
      </section>

      <section className={`${SURFACE} overflow-hidden`}>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4 xl:px-5">
          <h2 className="text-base font-semibold text-white"><UiText text={"Top content"} /></h2>
          <Link href="/admin/content" className="text-xs font-medium text-xiio-accent hover:underline"><UiText text={"View content →"} /></Link>
        </div>
        {data.topContent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                <tr>
                  <th className="px-4 py-3 xl:px-5"><UiText text={"Title"} /></th>
                  <th className="px-3 py-3 text-right"><UiText text={"Live viewers"} /></th>
                  <th className="px-3 py-3 text-right"><UiText text={"Views"} /></th>
                  <th className="px-3 py-3 text-right"><UiText text={"Watch time"} /></th>
                  <th className="px-3 py-3"><UiText text={"Completion"} /></th>
                  <th className="px-3 py-3 text-right"><UiText text={"Delivery"} /></th>
                  <th className="px-4 py-3 text-right xl:px-5"><UiText text={"Status"} /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {data.topContent.map((item) => (
                  <tr key={`${item.ownerUid}_${item.workId}`} className="transition hover:bg-white/[0.025]">
                    <td className="px-4 py-2 xl:px-5">
                      <Link href={`/watch/${item.ownerUid}/${item.workId}`} className="flex items-center gap-3 font-medium text-white hover:text-xiio-accent">
                        <span className="h-9 w-16 shrink-0 overflow-hidden rounded-md bg-white/[0.06]">
                          {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
                        </span>
                        <span className="max-w-[240px] truncate">{item.title}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-white">{item.liveViewers}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-white/65">{formatCompact(item.views, 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-white/65">{formatCompact(item.watchMinutes)}{" "}<UiText text={"min"} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 tabular-nums text-white/55">{item.completionPercent == null ? "—" : `${item.completionPercent.toFixed(0)}%`}</span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-xiio-accent" style={{ width: `${item.completionPercent ?? 0}%` }} /></div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-white/65">{item.deliveryMinutes == null ? "—" : `${formatCompact(item.deliveryMinutes)} min`}</td>
                    <td className="px-4 py-2 text-right xl:px-5">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${item.status === "live" ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300" : "border-xiio-accent/30 bg-xiio-accent/10 text-xiio-accent-hover"}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-white/35"><UiText text={"Published content will appear here."} /></p>
        )}
      </section>

      <section className={`${SURFACE} grid gap-px overflow-hidden bg-white/10 sm:grid-cols-2 xl:grid-cols-4`}>
        {data.systemHealth.map((item) => (
          <div key={item.key} className="flex items-center gap-3 bg-xiio-surface px-4 py-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${item.status === "operational" ? "bg-emerald-400" : item.status === "warning" ? "bg-amber-400" : "bg-white/25"}`} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white/80">{item.label}</p>
              <p className="truncate text-[10px] text-white/35">{item.detail}</p>
            </div>
          </div>
        ))}
      </section>

      <p className="text-right text-[10px] text-white/25"><UiText text={"Updated"} />{" "}{new Date(data.generatedAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}{" "}<UiText text={"· auto-refreshes every 15 seconds"} /></p>
    </div>
  );
}
