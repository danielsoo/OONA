export const PROFILE_SECTION_IDS = [
  "about",
  "handle",
  "public",
  "portfolio",
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTION_IDS)[number];

export function parseProfileSection(raw: string | null): ProfileSectionId {
  if (raw === "displayName") {
    return "about";
  }
  // "discover" was the switch that decides whether anyone can find you and
  // "preview" was the page they find. They are one section now; links to
  // either still land on it.
  if (raw === "discover" || raw === "preview") {
    return "public";
  }
  if (raw && PROFILE_SECTION_IDS.includes(raw as ProfileSectionId)) {
    return raw as ProfileSectionId;
  }
  return "about";
}
