"use client";

import Link from "next/link";

export type TabItem = { id: string; label: string; href?: string };

type Props = {
  items: TabItem[];
  activeId: string;
  onChange?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
};

const TAB =
  "relative shrink-0 rounded-sm pb-3 text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-xiio-accent/70";

/** Underline tabs. Items with `href` render as links (route tabs), others as buttons. */
export default function Tabs({ items, activeId, onChange, ariaLabel, className = "" }: Props) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`scrollbar-none flex gap-7 overflow-x-auto border-b border-line ${className}`.trim()}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const cls = `${TAB} ${active ? "text-ink" : "text-ink-3 hover:text-ink-2"}`;
        const underline = active ? (
          <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-ink" aria-hidden />
        ) : null;
        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              role="tab"
              aria-selected={active}
              scroll={false}
              className={cls}
            >
              {item.label}
              {underline}
            </Link>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.id)}
            className={cls}
          >
            {item.label}
            {underline}
          </button>
        );
      })}
    </div>
  );
}
