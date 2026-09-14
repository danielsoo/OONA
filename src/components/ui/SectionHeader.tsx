import Link from "next/link";

type Props = {
  title: string;
  /** Optional short label above the title (text-micro, uppercase). */
  eyebrow?: string;
  action?: { href: string; label: string };
  id?: string;
  className?: string;
};

/** The one section title style: 22px sentence case, optional "View all" on the right. */
export default function SectionHeader({ title, eyebrow, action, id, className = "" }: Props) {
  return (
    <div className={`mb-4 flex items-end justify-between gap-4 ${className}`.trim()}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-micro font-semibold uppercase text-xiio-accent">{eyebrow}</p>
        ) : null}
        <h2 id={id} className="text-h2 font-semibold text-ink">
          {title}
        </h2>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-full py-1 text-small font-medium text-ink-3 transition-colors hover:text-ink"
        >
          {action.label}
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      ) : null}
    </div>
  );
}
