"use client";

import { useState, type ReactNode } from "react";
import { useUiCopy } from "@/components/i18n/UiText";

/**
 * A chart's card: title, what it shows, and (when given) a table of the same
 * numbers behind a toggle, so nothing is only readable from the picture.
 */
export default function ChartCard({
  title,
  subtitle,
  table,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  table?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  const copy = useUiCopy();
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-xiio-surface p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-[#898781]">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {action}
          {table ? (
            <button
              type="button"
              aria-pressed={asTable}
              onClick={() => setAsTable((on) => !on)}
              className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-[#c3c2b7] transition hover:bg-white/5"
            >
              {asTable ? copy("Show chart") : copy("Show table")}
            </button>
          ) : null}
        </div>
      </header>
      {asTable && table ? <div className="overflow-x-auto">{table}</div> : children}
    </section>
  );
}

/** The plain table a chart can flip to. */
export function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-white/10 text-[#898781]">
          {head.map((cell, i) => (
            <th key={i} className={`py-1.5 pr-4 font-medium ${i > 0 ? "text-right" : ""}`}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-b border-white/[0.05]">
            {row.map((cell, i) => (
              <td key={i} className={`py-1.5 pr-4 ${i > 0 ? "text-right tabular-nums text-[#c3c2b7]" : "text-white"}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
