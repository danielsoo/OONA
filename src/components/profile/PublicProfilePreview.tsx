"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import UiText from "@/components/i18n/UiText";
import SocietyPublicProfileHero from "@/components/society/SocietyPublicProfileHero";
import { useTranslations } from "@/context/LocaleContext";
import { buildProfileConstellation } from "@/lib/profileHeroLook";
import type { PeopleProfilePayload } from "@/components/profile/PeopleProfileView";
import editorial from "@/components/society/EditorialProfile.module.css";
import styles from "@/components/settings/SettingsPage.module.css";

/**
 * The width the page is drawn at before being scaled down, so a panel that
 * is narrower than a desktop still previews the desktop hero rather than
 * the phone layout its own width would trigger.
 */
const STAGE_WIDTH = 1280;

/**
 * Below this the panel is on a phone, and the page is drawn at the width it
 * has: the phone layout at full size is both the real thing and readable,
 * where a shrunk desktop page would be neither.
 */
const SCALE_BELOW = 720;

type Props = {
  data: PeopleProfilePayload;
  /** Off where the section around it already says what this is. */
  showLabel?: boolean;
  /** The demo's profile, where the hero's buttons are deliberately dead. */
  demo?: boolean;
  className?: string;
};

/**
 * /people/<handle> itself, drawn at desktop width and scaled into whatever
 * room there is.
 *
 * It renders the real SocietyPublicProfileHero with the real data — the sky,
 * the name, their star with its works around it, the stats — so the preview
 * cannot say one thing while the page says another. Earlier versions of this
 * panel were hand-written lookalikes, and every one of them drifted: a
 * different photo behind it, the first role tag where the headline belongs,
 * a school of "OONA" for people with none, and, for an empty profile, a bio
 * and the tags "director" and "storytelling" nobody had chosen.
 *
 * It is drawn as the visitor sees it, and it is inert: nothing inside takes
 * a click, and screen readers skip it in favour of the ↗ that opens the real
 * page.
 */
export default function PublicProfilePreview({ data, showLabel = true, demo = false, className }: Props) {
  const { t } = useTranslations();
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(STAGE_WIDTH);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);

  // The page is laid out at a fixed width and shrunk into the room available,
  // so the preview stays the same page whatever width this panel is given.
  useEffect(() => {
    const outer = box.current;
    const inner = stage.current;
    if (!outer || !inner) return;
    const measure = () => {
      const room = outer.clientWidth;
      const width = room >= SCALE_BELOW ? STAGE_WIDTH : room;
      setStageWidth(width);
      const next = room / width;
      setScale(next);
      setHeight(inner.scrollHeight * next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  const roleLabel = (role: string) => {
    const key = `watch.creditRole.${role.toLowerCase()}`;
    const label = t(key);
    return label === key ? role : label;
  };

  return (
    <div className={className ? `${styles.preview} ${className}` : styles.preview}>
      <div className={styles.previewLabel}>
        <span>{showLabel ? <UiText text={"PUBLIC PREVIEW"} /> : null}</span>
        {data.profile.handle ? (
          <Link
            href={`/people/${encodeURIComponent(data.profile.handle)}`}
            aria-label={t("accountProfile.openPublicProfile")}
          >
            ↗
          </Link>
        ) : (
          <span aria-hidden="true">↗</span>
        )}
      </div>

      <div ref={box} className={styles.previewStage} style={{ height: height || undefined }}>
        <div
          ref={stage}
          className={styles.previewPage}
          style={{ width: stageWidth, transform: scale && scale !== 1 ? `scale(${scale})` : undefined }}
          aria-hidden="true"
        >
          <div className={editorial.page}>
            <SocietyPublicProfileHero
              demo={demo}
              displayName={data.profile.displayName}
              handle={data.profile.handle}
              headline={data.profile.headline}
              bio={data.profile.bio}
              avatarUrl={data.profile.avatarUrl}
              schoolName={data.profile.schoolName}
              profileLink={data.profile.profileLink}
              societyBannerBackgroundId={data.profile.societyBannerBackgroundId}
              followerCount={data.profile.followerCount}
              followingCount={data.profile.followingCount}
              stats={data.stats}
              isOnline={data.isOnline}
              openToCollaborate={data.profile.openToCollaborate}
              profileUid={data.profile.uid}
              /* A visitor's view: the point of the panel is what they get. */
              isSelf={false}
              isFollowing={false}
              tab="works"
              onTab={() => {}}
              counts={{ works: data.directed.length, credits: data.credited.length }}
              works={buildProfileConstellation(data.directed, data.credited, roleLabel)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
