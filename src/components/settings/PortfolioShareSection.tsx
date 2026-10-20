"use client";

import PortfolioSharePanel from "@/components/portfolio/PortfolioSharePanel";

/** Settings › Profile › Portfolio: the same panel the profile's "Share my portfolio" opens. */
export default function PortfolioShareSection(props: { ownerName?: string; thumbs?: Record<string, string | null | undefined> }) {
  return <PortfolioSharePanel {...props} />;
}
