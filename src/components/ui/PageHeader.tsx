import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right side of the title row: a primary action, a count. */
  actions?: ReactNode;
  /** Below the description: tabs or filters. */
  children?: ReactNode;
  className?: string;
};

/**
 * Page title for pages without a photographic hero (Browse, Creators, Search,
 * My List, About). Heroes use `HeroCopy` with the display size instead.
 */
export default function PageHeader({ title, eyebrow, description, actions, children, className = "" }: Props) {
  return (
    <header className={`pb-6 pt-8 lg:pb-8 lg:pt-12 ${className}`.trim()}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-3 text-micro font-semibold uppercase text-xiio-accent">{eyebrow}</p>
          ) : null}
          <h1 className="font-serif text-[30px] font-semibold leading-[1.15] text-ink sm:text-h1">{title}</h1>
          {description ? <p className="mt-3 max-w-[60ch] text-body text-ink-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
}
