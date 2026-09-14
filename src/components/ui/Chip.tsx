import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Dimmed prefix inside the chip, e.g. the credit role before a name. */
  label?: ReactNode;
  href?: string;
  className?: string;
};

const CHIP =
  "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-line-strong px-3 text-small text-ink transition-colors";

export default function Chip({ children, label, href, className = "" }: Props) {
  const inner = (
    <>
      {label ? <span className="shrink-0 text-ink-3">{label}</span> : null}
      <span className="truncate font-medium">{children}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`${CHIP} hover:border-ink-3 hover:bg-white/[0.06] ${className}`.trim()}>
        {inner}
      </Link>
    );
  }
  return <span className={`${CHIP} ${className}`.trim()}>{inner}</span>;
}
