import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";

type Props = {
  title: string;
  body?: ReactNode;
  action?: { href: string; label: string };
  className?: string;
};

/** What a section shows when there is no real data yet: one sentence and one next step. */
export default function EmptyState({ title, body, action, className = "" }: Props) {
  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-card border border-dashed border-line-strong px-6 py-8 ${className}`.trim()}
    >
      <p className="text-h3 font-semibold text-ink">{title}</p>
      {body ? <p className="max-w-[56ch] text-body text-ink-3">{body}</p> : null}
      {action ? (
        <ButtonLink href={action.href} variant="secondary" size="md" className="mt-1">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
