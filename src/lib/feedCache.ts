import { isDemoVisit } from "@/lib/demo-flags";

type CacheEntry<T> = { data: T; expiresAt: number; staleUntil: number };
type StoredCacheEntry = CacheEntry<unknown> & { version: 1; key: string };

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL_MS = 2 * 60 * 1000;
const PERSISTENT_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "xiio:feed-cache:v1:";
/** The demo keeps its made-up feeds apart, so neither side ever shows the other's. */
const DEMO_STORAGE_PREFIX = "xiio:feed-cache:v1:demo:";

function isPersistentKey(key: string): boolean {
  return (
    key.startsWith("catalog:") ||
    key.startsWith("promo:") ||
    key.startsWith("schools:") ||
    key.startsWith("society:")
  );
}

function persistentStorageKey(key: string): string {
  return `${isDemoVisit() ? DEMO_STORAGE_PREFIX : STORAGE_PREFIX}${encodeURIComponent(key)}`;
}

function removeStored(key: string) {
  if (typeof window === "undefined" || !isPersistentKey(key)) return;
  try {
    localStorage.removeItem(persistentStorageKey(key));
  } catch {
    // Browser storage can be unavailable; memory caching remains active.
  }
}

function readEntry<T>(key: string): CacheEntry<T> | undefined {
  let entry = cache.get(key) as CacheEntry<T> | undefined;

  if (!entry && typeof window !== "undefined" && isPersistentKey(key)) {
    try {
      const raw = localStorage.getItem(persistentStorageKey(key));
      if (raw) {
        const stored = JSON.parse(raw) as StoredCacheEntry;
        if (stored.version === 1 && stored.key === key && stored.data !== undefined) {
          entry = stored as CacheEntry<T>;
          cache.set(key, entry);
        }
      }
    } catch {
      removeStored(key);
    }
  }

  if (!entry) return undefined;
  if (Date.now() > entry.staleUntil) {
    cache.delete(key);
    removeStored(key);
    return undefined;
  }
  return entry;
}

export function getCached<T>(key: string): T | undefined {
  const entry = readEntry<T>(key);
  if (!entry) return undefined;
  return entry.data as T;
}

function getFreshCached<T>(key: string): T | undefined {
  const entry = readEntry<T>(key);
  if (!entry || Date.now() > entry.expiresAt) return undefined;
  return entry.data;
}

export function setCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  const now = Date.now();
  const entry: CacheEntry<T> = {
    data,
    expiresAt: now + ttlMs,
    staleUntil: now + (isPersistentKey(key) ? PERSISTENT_STALE_TTL_MS : ttlMs),
  };
  cache.set(key, entry);

  if (typeof window !== "undefined" && isPersistentKey(key)) {
    try {
      localStorage.setItem(
        persistentStorageKey(key),
        JSON.stringify({ version: 1, key, ...entry } satisfies StoredCacheEntry)
      );
    } catch {
      // A full storage quota must not block the live feed.
    }
  }
}

export async function getOrLoadCached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = getFreshCached<T>(key);
  if (cached !== undefined) return cached;

  const active = inFlight.get(key);
  if (active) return active as Promise<T>;

  const promise = loader()
    .then((data) => {
      setCache(key, data, ttlMs);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    inFlight.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      removeStored(key);
    }
  }
  for (const key of inFlight.keys()) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
  // Copies kept in localStorage that this page never read back are stale too.
  if (typeof window !== "undefined" && isPersistentKey(prefix)) {
    try {
      const stored = persistentStorageKey(prefix);
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key?.startsWith(stored)) localStorage.removeItem(key);
      }
    } catch {
      // Browser storage can be unavailable; the memory cache is already cleared.
    }
  }
}
