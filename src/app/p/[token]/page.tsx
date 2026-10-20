"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PortfolioView, { PortfolioMissing, PortfolioSkeleton } from "@/components/portfolio/PortfolioView";
import { useTranslations } from "@/context/LocaleContext";
import { isDemoHandle } from "@/lib/demo-flags";
import type { PublicPortfolioPayload } from "@/types/portfolio";

export default function PublicPortfolioPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslations();
  const [data, setData] = useState<PublicPortfolioPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let live = true;
    void (async () => {
      setLoading(true);
      try {
        // A made-up person's (/p/demo-<id>) answers from the demo set, not the API.
        if (isDemoHandle(token)) {
          const payload = (await import("@/lib/society-demo")).demoPortfolio(token);
          if (!live) return;
          setData(payload);
          setErr(payload ? null : t("portfolio.public.notFound"));
          return;
        }
        const res = await fetch(`/api/portfolio/${encodeURIComponent(token)}`);
        if (!live) return;
        if (!res.ok) {
          setErr(res.status === 410 ? t("portfolio.public.expired") : t("portfolio.public.notFound"));
          setData(null);
          return;
        }
        const payload = (await res.json()) as PublicPortfolioPayload;
        if (!live) return;
        setData(payload);
        setErr(null);
      } catch {
        if (live) setErr(t("portfolio.public.loadError"));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [token, t]);

  if (loading) return <PortfolioSkeleton />;
  if (err || !data) return <PortfolioMissing message={err ?? t("portfolio.public.notFound")} />;
  return <PortfolioView data={data} profileHref={`/people/${encodeURIComponent(data.profile.handle)}`} />;
}
