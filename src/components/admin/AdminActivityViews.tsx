"use client";

import { useState } from "react";
import AdminActivityLog from "@/components/admin/AdminActivityLog";
import AdminActivityInsights from "@/components/admin/insights/AdminActivityInsights";
import { useUiCopy } from "@/components/i18n/UiText";

/** The admin's Activity tab: the charts, or every event one by one (where a person search opens). */
export default function AdminActivityViews({ initialWho }: { initialWho?: string }) {
  const copy = useUiCopy();
  const [view, setView] = useState<"charts" | "log">(initialWho ? "log" : "charts");
  return (
    <div>
      <div className="mb-6 inline-flex rounded-lg border border-white/10 p-1" role="tablist" aria-label={copy("Activity views")}>
        {([
          ["charts", copy("Charts")],
          ["log", copy("Event log")],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${view === id ? "bg-xiio-accent text-white" : "text-white/60 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "charts" ? <AdminActivityInsights /> : <AdminActivityLog initialWho={initialWho} />}
    </div>
  );
}
