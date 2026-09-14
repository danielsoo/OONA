import type { ReactNode } from "react";

/**
 * Hero stage: sized to its content, never to the viewport, so the first rail
 * stays visible in the opening frame on phones.
 */
export const HERO_COPY_STAGE_CLASS =
  "relative z-10 flex min-h-[440px] flex-col justify-end px-4 pb-10 pt-24 sm:min-h-[480px] lg:min-h-[540px] lg:justify-center lg:px-12 lg:pb-12 lg:pt-20";

/** Section wrapper height that matches the stage above. */
export const HERO_SECTION_CLASS = "relative isolate overflow-hidden";

type Props = {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  eyebrowTone?: "accent" | "gold";
  children?: ReactNode;
};

/** Shared, image-independent copy layout for the primary destination heroes. */
export default function HeroCopy({
  eyebrow,
  title,
  description,
  eyebrowTone = "accent",
  children,
}: Props) {
  return (
    <div className="min-w-0 max-w-[680px]">
      <p
        className={`mb-4 text-micro font-semibold uppercase ${
          eyebrowTone === "gold" ? "text-xiio-gold" : "text-xiio-accent"
        }`}
      >
        {eyebrow}
      </p>
      <h1 className="mb-5 font-serif text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] text-ink">
        {title}
      </h1>
      <div className={`max-w-[60ch] text-body text-ink-2 ${children ? "mb-7" : ""}`}>{description}</div>
      {children}
    </div>
  );
}
