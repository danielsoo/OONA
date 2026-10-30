/**
 * Profile pictures anyone can pick without uploading anything: two sets of
 * drawn icons, one from a set and one from the sea, in the same deep blue as
 * the rest of the site.
 *
 * The paths here are also the allowlist. /api/me/professional-profile only
 * takes an avatarUrl that is either a file the signed-in person uploaded to
 * their own storage folder or one of these exact strings, so a preset cannot
 * become a way to point an avatar at any address on the internet.
 */
export type AvatarPreset = {
  id: string;
  /** Served from public/images/avatars; this exact string is what is stored. */
  src: string;
  /** English source text, translated through uiMessages where it is shown. */
  label: string;
};

export const AVATAR_PRESET_GROUPS: { id: string; label: string; presets: AvatarPreset[] }[] = [
  {
    id: "set",
    label: "On set",
    presets: [
      { id: "film-chair", src: "/images/avatars/film-chair.webp", label: "Director's chair" },
      { id: "film-camera", src: "/images/avatars/film-camera.webp", label: "Film camera" },
      { id: "film-clapperboard", src: "/images/avatars/film-clapperboard.webp", label: "Clapperboard" },
      { id: "film-reel", src: "/images/avatars/film-reel.webp", label: "Film reel" },
      { id: "film-light", src: "/images/avatars/film-light.webp", label: "Studio light" },
      { id: "film-popcorn", src: "/images/avatars/film-popcorn.webp", label: "Popcorn" },
    ],
  },
  {
    id: "sea",
    label: "Under the sea",
    presets: [
      { id: "sea-whale", src: "/images/avatars/sea-whale.webp", label: "Whale" },
      { id: "sea-wave", src: "/images/avatars/sea-wave.webp", label: "Wave" },
      { id: "sea-jellyfish", src: "/images/avatars/sea-jellyfish.webp", label: "Jellyfish" },
      { id: "sea-beluga", src: "/images/avatars/sea-beluga.webp", label: "Beluga" },
      { id: "sea-coral", src: "/images/avatars/sea-coral.webp", label: "Coral" },
    ],
  },
];

export const AVATAR_PRESETS: AvatarPreset[] = AVATAR_PRESET_GROUPS.flatMap((group) => group.presets);

const PRESET_SRCS = new Set(AVATAR_PRESETS.map((preset) => preset.src));

/** Whether a stored avatarUrl is one of the presets, rather than an upload. */
export function isAvatarPreset(value: string): boolean {
  return PRESET_SRCS.has(value);
}

/** Where an uploaded avatar may be served from, and nowhere else. */
const STORAGE_HOSTS = new Set(["firebasestorage.googleapis.com", "storage.googleapis.com"]);

/**
 * Whether a URL is a file this person uploaded into their own storage folder.
 *
 * getDownloadURL() percent-encodes the object path, so a real avatar arrives
 * as /v0/b/<bucket>/o/users%2F<uid>%2Fprofile%2Favatar.jpg — the slashes are
 * %2F. Matching the literal "/users/<uid>/profile/" against that never hit,
 * which is why saving an uploaded photo failed while the file itself went up
 * fine. The object path is pulled out and decoded instead.
 *
 * The host is checked too: a bare substring match would have taken
 * https://anywhere.example/users/<uid>/profile/a.jpg just as happily.
 */
function isOwnUpload(value: string, uid: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (!STORAGE_HOSTS.has(host) && !host.endsWith(".firebasestorage.app")) return false;

  // /v0/b/<bucket>/o/<encoded path>, or storage.googleapis.com/<bucket>/<path>
  const marker = "/o/";
  const at = url.pathname.indexOf(marker);
  const raw =
    url.pathname.startsWith("/v0/b/") && at !== -1
      ? url.pathname.slice(at + marker.length)
      : url.pathname.replace(/^\/[^/]*\/?/, "");
  if (!raw) return false;
  let objectPath: string;
  try {
    objectPath = decodeURIComponent(raw);
  } catch {
    return false;
  }
  return objectPath.startsWith(`users/${uid}/profile/`);
}

/**
 * What /api/me/professional-profile will store for an avatar: one of the
 * presets, or a file this person uploaded into their own storage folder.
 * Anything else returns undefined and the request is refused — an avatar
 * follows someone onto every page they appear on, so it must never be a way
 * to point the site at an arbitrary address.
 *
 * null clears the picture; undefined means the input was no good.
 */
export function parseAvatarUrlInput(value: unknown, uid: string): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, 2048);
  if (!trimmed) return null;
  if (isAvatarPreset(trimmed)) return trimmed;
  if (!isOwnUpload(trimmed, uid)) return undefined;
  return trimmed;
}

/**
 * The read side of the same rule: the avatar as it comes back out of a user
 * doc, for every page that shows someone's picture.
 *
 * An uploaded photo is an https URL, but a picked preset is stored as the path
 * it is served from, so an https-only check threw every preset away on read —
 * the save wrote it and the next read dropped it, and the picture appeared to
 * revert on refresh.
 *
 * This cannot re-check the uploader's uid (the doc is read in places that do
 * not have it), so an https URL is taken as written; the write side is where
 * an upload is pinned to its owner's folder. Anything that is neither is still
 * refused: a stray string in the doc must not become an image src.
 */
export function parseStoredAvatarUrl(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (isAvatarPreset(trimmed)) return trimmed;
  return trimmed.startsWith("https://") ? trimmed.slice(0, 2048) : undefined;
}
