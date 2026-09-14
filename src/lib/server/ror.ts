import type { SchoolGeoLocation, SchoolSuggestion } from "@/types/school";

type RorName = { value?: unknown; types?: unknown };
type RorLocationDetails = {
  lat?: unknown;
  lng?: unknown;
  name?: unknown;
  country_name?: unknown;
  country_code?: unknown;
};
type RorItem = {
  id?: unknown;
  names?: unknown;
  types?: unknown;
  locations?: unknown;
};

function initials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((word) => !["the", "of", "and", "at"].includes(word.toLowerCase()));
  if (words.length === 1) return words[0]!.slice(0, 5).toUpperCase();
  return words.map((word) => word[0]).join("").toUpperCase().slice(0, 5);
}

function displayName(item: RorItem): string | null {
  if (!Array.isArray(item.names)) return null;
  const names = item.names as RorName[];
  const preferred = names.find((entry) =>
    Array.isArray(entry.types) && entry.types.some((type) => type === "ror_display")
  ) ?? names[0];
  return typeof preferred?.value === "string" && preferred.value.trim()
    ? preferred.value.trim()
    : null;
}

function locationFor(item: RorItem): SchoolGeoLocation | null {
  if (!Array.isArray(item.locations)) return null;
  for (const rawLocation of item.locations) {
    if (!rawLocation || typeof rawLocation !== "object") continue;
    const details = (rawLocation as { geonames_details?: unknown }).geonames_details;
    if (!details || typeof details !== "object") continue;
    const geo = details as RorLocationDetails;
    if (typeof geo.lat !== "number" || typeof geo.lng !== "number") continue;
    const latitude = geo.lat;
    const longitude = geo.lng;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) continue;
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) continue;
    return {
      latitude,
      longitude,
      ...(typeof geo.name === "string" && geo.name.trim() ? { city: geo.name.trim() } : {}),
      ...(typeof geo.country_name === "string" && geo.country_name.trim()
        ? { country: geo.country_name.trim() }
        : {}),
      ...(typeof geo.country_code === "string" && geo.country_code.trim()
        ? { countryCode: geo.country_code.trim().toUpperCase().slice(0, 2) }
        : {}),
      source: "geocoded",
    };
  }
  return null;
}

export async function searchRorSchools(query: string, limit = 6): Promise<SchoolSuggestion[]> {
  const cleanQuery = query.trim().replace(/"/g, "").slice(0, 100);
  if (cleanQuery.length < 2 || limit < 1) return [];

  const params = new URLSearchParams({ query: `"${cleanQuery}"` });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`https://api.ror.org/v2/organizations?${params}`, {
      headers: {
        Accept: "application/json",
        ...(process.env.ROR_CLIENT_ID ? { "Client-Id": process.env.ROR_CLIENT_ID } : {}),
      },
      signal: controller.signal,
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { items?: unknown };
    if (!Array.isArray(payload.items)) return [];

    return (payload.items as RorItem[])
      .filter((item) =>
        Array.isArray(item.types) &&
        item.types.some((type) => String(type).toLowerCase() === "education")
      )
      .flatMap((item) => {
        const name = displayName(item);
        const location = locationFor(item);
        const externalId = typeof item.id === "string" ? item.id : null;
        if (!name || !location || !externalId) return [];
        return [{
          id: `ror:${externalId.replace(/^https:\/\/ror\.org\//, "")}`,
          name,
          shortName: name,
          initials: initials(name),
          logoUrl: null,
          colorPrimary: "#176cb0",
          colorSecondary: "#eef8ff",
          location,
          source: "ror" as const,
          externalId,
        }];
      })
      .slice(0, Math.min(8, limit));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
