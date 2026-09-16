import type { User } from "firebase/auth";
import { getCached, getOrLoadCached, setCache } from "@/lib/feedCache";
import type { SocietyPerson } from "@/lib/societyTypes";
import type { ProfileRoleTag } from "@/types/portfolio";

const PEOPLE_TTL_MS = 2 * 60 * 1000;
const FOLLOWING_TTL_MS = 60 * 1000;

type PeopleOptions = {
  followingOnly?: boolean;
  role?: "" | ProfileRoleTag;
  q?: string;
};

export type SocietyPeopleResult = {
  people: SocietyPerson[];
};

function normalizedQuery(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

export function societyPeopleCacheKey(user: User | null, options: PeopleOptions = {}): string {
  const scope = options.followingOnly ? `following:${user?.uid ?? "anonymous"}` : "public";
  const role = options.role || "all";
  const query = encodeURIComponent(normalizedQuery(options.q));
  return `society:people:${scope}:${role}:${query}`;
}

export function readSocietyPeople(
  user: User | null,
  options: PeopleOptions = {}
): SocietyPeopleResult | undefined {
  return getCached<SocietyPeopleResult>(societyPeopleCacheKey(user, options));
}

export async function loadSocietyPeople(
  user: User | null,
  options: PeopleOptions = {}
): Promise<SocietyPeopleResult> {
  const key = societyPeopleCacheKey(user, options);
  return getOrLoadCached(
    key,
    async () => {
      const params = new URLSearchParams();
      if (options.followingOnly) params.set("followingOnly", "1");
      if (options.role) params.set("role", options.role);
      if (options.q?.trim()) params.set("q", options.q.trim());

      const headers: HeadersInit = {};
      if (options.followingOnly) {
        if (!user) return { people: [] };
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }

      const suffix = params.size > 0 ? `?${params.toString()}` : "";
      const response = await fetch(`/api/discover/people${suffix}`, { headers });
      if (!response.ok) throw new Error("society_people_failed");
      const body = (await response.json()) as { people?: SocietyPerson[] };
      return { people: body.people ?? [] };
    },
    PEOPLE_TTL_MS
  );
}

function followingCacheKey(uid: string): string {
  return `society:following:${uid}`;
}

export function readFollowingUids(uid: string): string[] | undefined {
  return getCached<string[]>(followingCacheKey(uid));
}

export async function loadFollowingUids(user: User): Promise<string[]> {
  const key = followingCacheKey(user.uid);
  return getOrLoadCached(
    key,
    async () => {
      const token = await user.getIdToken();
      const response = await fetch("/api/me/following", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("society_following_failed");
      const body = (await response.json()) as { uids?: string[] };
      return body.uids ?? [];
    },
    FOLLOWING_TTL_MS
  );
}

export function addFollowingUid(uid: string, followingUid: string): string[] {
  const next = [...new Set([...(readFollowingUids(uid) ?? []), followingUid])];
  setCache(followingCacheKey(uid), next, FOLLOWING_TTL_MS);
  return next;
}

export function updateFollowingUid(uid: string, followingUid: string, connected: boolean): string[] {
  const current = readFollowingUids(uid) ?? [];
  const next = connected
    ? [...new Set([...current, followingUid])]
    : current.filter((item) => item !== followingUid);
  setCache(followingCacheKey(uid), next, FOLLOWING_TTL_MS);
  return next;
}
