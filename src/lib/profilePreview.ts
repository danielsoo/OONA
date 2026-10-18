/**
 * What's already known about someone before their profile loads, from the
 * page their name was clicked on (Society keeps its people here), so the
 * profile can show their name and picture at once. Kept in memory for this
 * visit only.
 */
export type ProfilePreview = { name: string; avatarUrl: string | null; headline: string | null };

const previews = new Map<string, ProfilePreview>();

const keyOf = (handle: string) => {
  try {
    return decodeURIComponent(handle).toLowerCase();
  } catch {
    return handle.toLowerCase();
  }
};

export function rememberProfilePreviews(people: readonly ({ handle: string | null } & ProfilePreview)[]): void {
  for (const { handle, name, avatarUrl, headline } of people) {
    if (handle && name) previews.set(keyOf(handle), { name, avatarUrl, headline });
  }
}

export function profilePreview(handle: string): ProfilePreview | null {
  return previews.get(keyOf(handle)) ?? null;
}
