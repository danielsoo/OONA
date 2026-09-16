import type { User } from "firebase/auth";
import type { BusinessInviteListItem } from "@/types/business-invite";

export type InviteBox = "received" | "sent";

const TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; items: BusinessInviteListItem[] }>();
const inFlight = new Map<string, Promise<BusinessInviteListItem[]>>();

function key(uid: string, box: InviteBox) {
  return `${uid}:${box}`;
}

export async function loadBusinessInvites(
  user: User,
  box: InviteBox
): Promise<BusinessInviteListItem[]> {
  const cacheKey = key(user.uid, box);
  const stored = cache.get(cacheKey);
  if (stored && stored.expiresAt > Date.now()) return stored.items;

  const active = inFlight.get(cacheKey);
  if (active) return active;

  const request = (async () => {
    const token = await user.getIdToken();
    const response = await fetch(`/api/me/business-invites?box=${box}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("load_failed");
    const data = (await response.json()) as { invites?: BusinessInviteListItem[] };
    const items = data.invites ?? [];
    cache.set(cacheKey, { items, expiresAt: Date.now() + TTL_MS });
    return items;
  })().finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, request);
  return request;
}

export function setCachedBusinessInvites(
  uid: string,
  box: InviteBox,
  items: BusinessInviteListItem[]
) {
  cache.set(key(uid, box), { items, expiresAt: Date.now() + TTL_MS });
}
