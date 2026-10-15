"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import UiText from "@/components/i18n/UiText";
import { ProfileWorksSection } from "@/components/society/SocietyProfileBody";
import styles from "@/components/society/EditorialProfile.module.css";
import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { getCached, setCache } from "@/lib/feedCache";

export default function SocietySelfProfileSection() {
  const { user } = useAuth();
  const { t } = useTranslations();
  const cacheKey = `society-self:${user?.uid}`;
  const cached = getCached<PeopleProfilePayload>(cacheKey);
  const [data, setData] = useState<PeopleProfilePayload | null>(cached ?? null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }
    if (cached) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const proRes = await fetch("/api/me/professional-profile", { headers });
      if (!proRes.ok) {
        setData(null);
        return;
      }
      const pro = (await proRes.json()) as { handle?: string | null };
      const handle = pro.handle?.trim();
      if (!handle) {
        setData(null);
        return;
      }
      const res = await fetch(`/api/people/${encodeURIComponent(handle)}`, { headers });
      if (!res.ok) {
        setData(null);
        return;
      }
      const payload = (await res.json()) as PeopleProfilePayload;
      setData(payload);
      setCache(cacheKey, payload);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user, cached, cacheKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;
  if (loading && !data) {
    return <p className="mb-8 px-4 text-sm text-white/40 lg:px-12">{t("common.loading")}</p>;
  }
  // No public profile yet (no handle), or it couldn't load: say so instead of showing nothing.
  if (!data?.profile.handle) {
    return (
      <div className={styles.emptyWorks}>
        <p><UiText text={"Set up your profile so collaborators can see your work."} /></p>
        <Link href="/account?tab=profile&section=about"><UiText text={"Edit profile"} /></Link>
      </div>
    );
  }

  return <ProfileWorksSection works={[...data.directed, ...data.credited]} isSelf ownerUid={data.profile.uid} />;
}
