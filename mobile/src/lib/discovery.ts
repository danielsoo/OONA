import type { CatalogFeedItem } from "@/types/work";
import { apiFetch } from "~/lib/api";

/** Search, My List and Society use the same endpoints as the website. */

export type PersonCard = {
  uid: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  headline?: string;
  roleTags: string[];
  openToCollaborate: boolean;
  followerCount: number;
  isOnline: boolean;
};

export async function searchPeople(q: string): Promise<PersonCard[]> {
  const data = await apiFetch<{ people?: PersonCard[] }>(`/api/discover/people?q=${encodeURIComponent(q)}`, { auth: "optional" });
  return data.people ?? [];
}

export async function discoverPeople(opts: { openOnly?: boolean; followingOnly?: boolean }): Promise<PersonCard[]> {
  const params = new URLSearchParams();
  if (opts.openOnly) params.set("openOnly", "1");
  if (opts.followingOnly) params.set("followingOnly", "1");
  const data = await apiFetch<{ people?: PersonCard[] }>(`/api/discover/people?${params}`, {
    auth: opts.followingOnly ? "required" : "optional",
  });
  return data.people ?? [];
}

export async function loadWatchlist(): Promise<CatalogFeedItem[]> {
  const data = await apiFetch<{ items?: CatalogFeedItem[] }>("/api/me/watchlist", { auth: "required" });
  return data.items ?? [];
}

export async function isSaved(ownerUid: string, workId: string): Promise<boolean> {
  const params = new URLSearchParams({ ownerUid, workId });
  const data = await apiFetch<{ saved?: boolean }>(`/api/me/watchlist?${params}`, { auth: "required" });
  return Boolean(data.saved);
}

export async function setSaved(ownerUid: string, workId: string, saved: boolean): Promise<boolean> {
  const data = await apiFetch<{ saved?: boolean }>("/api/me/watchlist", {
    method: "POST",
    auth: "required",
    json: { ownerUid, workId, saved },
  });
  return Boolean(data.saved);
}
