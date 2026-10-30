"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "@/context/LocaleContext";
import {
  PROFILE_SECTION_IDS,
  type ProfileSectionId,
} from "@/lib/profileSections";
import styles from "@/components/settings/SettingsPage.module.css";

export type MainTabId = "activity" | "profile";
export type ActivityTabId = "uploads" | "likes" | "watched";
/** The three places the menu leads to: /account's two tabs, and /settings. */
export type SettingsPlace = MainTabId | "settings";

type ActivityTab = { id: ActivityTabId; labelKey: string; count?: number };

type Props = {
  variant: "sidebar" | "mobile";
  place: SettingsPlace;
  /** On /account: switch between its tabs in place. Elsewhere they are links. */
  onMainTab?: (id: MainTabId) => void;
  activityTab?: ActivityTabId;
  onActivityTab?: (id: ActivityTabId) => void;
  activityTabs?: ActivityTab[];
  activityLoading?: boolean;
  profileSection?: ProfileSectionId;
  onProfileSection?: (id: ProfileSectionId) => void;
};

const PLACES: { id: SettingsPlace; labelKey: string; href: string }[] = [
  { id: "activity", labelKey: "accountProfile.tabActivity", href: "/account" },
  { id: "profile", labelKey: "accountProfile.tabProfileSettings", href: "/account?tab=profile&section=about" },
  { id: "settings", labelKey: "settings.title", href: "/settings" },
];

const SECTION_LABEL_KEYS: Record<ProfileSectionId, string> = {
  about: "accountProfile.sections.about",
  handle: "accountProfile.sections.handle",
  public: "accountProfile.sections.public",
  portfolio: "accountProfile.sections.portfolio",
};

type SubLink = { id: string; label: string; count?: number; on: boolean; select: () => void };

export default function AccountProfileNav({
  variant,
  place,
  onMainTab,
  activityTab = "uploads",
  onActivityTab,
  activityTabs = [],
  activityLoading = false,
  profileSection = "about",
  onProfileSection,
}: Props) {
  const { t } = useTranslations();
  const sidebar = variant === "sidebar";

  const subs: SubLink[] =
    place === "activity" && onActivityTab
      ? activityTabs.map(({ id, labelKey, count }) => ({
          id,
          label: t(labelKey),
          count: !activityLoading && count ? count : undefined,
          on: activityTab === id,
          select: () => onActivityTab(id),
        }))
      : place === "profile" && onProfileSection
        ? PROFILE_SECTION_IDS.map((id) => ({
            id,
            label: t(SECTION_LABEL_KEYS[id]),
            on: profileSection === id,
            select: () => onProfileSection(id),
          }))
        : [];

  const placeLink = (id: SettingsPlace, label: string, href: string, className: string) => {
    const on = id === place;
    const cls = `${className} ${on ? (sidebar ? styles.navOn : styles.tabOn) : ""}`;
    // Tabs of the page you are on switch in place; the others are pages.
    if (onMainTab && id !== "settings" && place !== "settings") {
      return (
        <button key={id} type="button" className={cls} aria-current={on ? "page" : undefined} onClick={() => onMainTab(id)}>
          {label}
        </button>
      );
    }
    return (
      <Link key={id} href={href} className={cls} aria-current={on ? "page" : undefined}>
        {label}
      </Link>
    );
  };

  const subList = (wrap: (children: ReactNode) => ReactNode, itemClass: string, onClass: string) =>
    subs.length > 0
      ? wrap(
          subs.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className={`${itemClass} ${sub.on ? onClass : ""}`}
              aria-current={sub.on ? "true" : undefined}
              onClick={sub.select}
            >
              <span>{sub.label}</span>
              {sub.count !== undefined ? <span className={styles.count}>{sub.count}</span> : null}
            </button>
          ))
        )
      : null;

  if (sidebar) {
    return (
      <nav className={styles.nav} aria-label={t("accountProfile.title")}>
        {PLACES.map(({ id, labelKey, href }) => (
          <div key={id}>
            {placeLink(id, t(labelKey), href, styles.navItem)}
            {id === place ? subList((children) => <div className={styles.navSub}>{children}</div>, styles.subItem, styles.subOn) : null}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label={t("accountProfile.title")}>
      <div className={styles.tabs}>
        {PLACES.map(({ id, labelKey, href }) => placeLink(id, t(labelKey), href, styles.tab))}
      </div>
      {subList((children) => <div className={styles.chips}>{children}</div>, styles.chip, styles.chipOn)}
    </nav>
  );
}
