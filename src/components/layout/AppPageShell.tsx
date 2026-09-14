import type { ReactNode } from "react";

/** AppShell content inset from the final imported redesign. */
export const PAGE_GUTTER_IN_SHELL = "px-4 lg:px-12";

/** AppShell 밖 standalone (verify 등) */
export const PAGE_GUTTER_STANDALONE = "px-4 sm:px-6 md:px-8 lg:px-10";

/** @deprecated PAGE_GUTTER_IN_SHELL 사용 */
export const PAGE_GUTTER = PAGE_GUTTER_IN_SHELL;

/** Max content width aligned with the 1400px handoff grid. */
export const PAGE_CONTAINER = "mx-auto w-full max-w-[1400px]";

type Props = {
  children: ReactNode;
  /** Navbar visible — top offset for fixed nav (default). */
  withNavbar?: boolean;
  /** Uploader / no global Navbar — less top padding. */
  standalone?: boolean;
  className?: string;
  contentClassName?: string;
  /** Lock the page to the viewport space below the 60px app top bar. */
  fitViewport?: boolean;
};

export default function AppPageShell({
  children,
  withNavbar = true,
  standalone = false,
  className = "",
  contentClassName = "",
  fitViewport = false,
}: Props) {
  const pt = standalone ? "pt-6" : withNavbar ? "pt-6" : "pt-6";
  const gutter = standalone ? PAGE_GUTTER_STANDALONE : PAGE_GUTTER_IN_SHELL;
  const height = fitViewport
    ? "h-[calc(100dvh-60px-64px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-60px)] min-h-0 overflow-hidden"
    : "min-h-screen pb-16";

  return (
    <main className={`${height} bg-xiio-bg ${pt} ${gutter} ${className}`.trim()}>
      <div className={`${PAGE_CONTAINER} ${contentClassName}`.trim()}>{children}</div>
    </main>
  );
}
