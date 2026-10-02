import type { NotificationListItem } from "@/types/notification";
import type { PublicWorkWatch } from "@/types/watch";
import type { CatalogFeedItem, PromoFeedItem, WatchProgressItem, WorkSection } from "@/types/work";
import { apiFetch } from "~/lib/api";

/** Same endpoints the website uses (src/lib/clientFeedLoaders.ts, src/hooks/*). */

export async function loadCatalog(section: WorkSection, limit = 24): Promise<CatalogFeedItem[]> {
  const data = await apiFetch<{ items?: CatalogFeedItem[] }>(`/api/feed/works?section=${section}&limit=${limit}`);
  return data.items ?? [];
}

export async function loadPromoShorts(): Promise<PromoFeedItem[]> {
  const data = await apiFetch<{ items?: PromoFeedItem[] }>("/api/feed/promo-shorts", { auth: "optional" });
  return data.items ?? [];
}

export async function loadContinueWatching(): Promise<WatchProgressItem[]> {
  const data = await apiFetch<{ items?: WatchProgressItem[] }>("/api/me/watch-progress", { auth: "required" });
  return data.items ?? [];
}

export function loadWatch(ownerUid: string, workId: string): Promise<PublicWorkWatch> {
  return apiFetch<PublicWorkWatch>(`/api/watch/${encodeURIComponent(ownerUid)}/${encodeURIComponent(workId)}`);
}

export function reportWatchProgress(ownerUid: string, workId: string, positionSec: number, durationSec: number) {
  return apiFetch("/api/me/watch-progress", {
    method: "POST",
    auth: "required",
    json: { ownerUid, workId, positionSec, durationSec },
  });
}

export function recordView(ownerUid: string, workId: string, sessionId: string) {
  return apiFetch("/api/engagement/view", {
    method: "POST",
    auth: "optional",
    json: { ownerUid, workId, target: "full", sessionId },
  });
}

export type PeopleWorkEntry = {
  workId: string;
  ownerUid: string;
  title: string;
  section: WorkSection;
  director?: string;
  role: string;
  characterName?: string;
  thumbnailUrl?: string | null;
  /** The profile owner's note about this work (portfolio memo). */
  profileNote?: string | null;
};

export type PeopleProfilePayload = {
  profile: {
    uid: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    headline?: string;
    bio?: string;
    roleTags: string[];
    openToCollaborate: boolean;
    followerCount: number;
    followingCount: number;
    schoolName?: string | null;
    collaborationNote?: string;
    profileLink?: string | null;
    societyBannerBackgroundId?: string | null;
  };
  isOnline?: boolean;
  viewer: { uid: string; isSelf: boolean; isFollowing: boolean } | null;
  directed: PeopleWorkEntry[];
  credited: PeopleWorkEntry[];
};

export function loadPeople(handle: string): Promise<PeopleProfilePayload> {
  return apiFetch<PeopleProfilePayload>(`/api/people/${encodeURIComponent(handle)}`, { auth: "optional" });
}

export function loadHandleForUid(uid: string): Promise<{ uid: string; handle: string }> {
  return apiFetch(`/api/people/by-uid/${encodeURIComponent(uid)}`);
}

export function setFollowing(uid: string, follow: boolean) {
  return apiFetch(`/api/me/follows/${encodeURIComponent(uid)}`, {
    method: follow ? "POST" : "DELETE",
    auth: "required",
  });
}

export async function loadNotifications(limit = 50): Promise<NotificationListItem[]> {
  const data = await apiFetch<{ notifications?: NotificationListItem[] }>(`/api/me/notifications?limit=${limit}`, {
    auth: "required",
  });
  return data.notifications ?? [];
}

export function markAllNotificationsRead() {
  return apiFetch("/api/me/notifications/mark-all-read", { method: "POST", auth: "required" });
}
