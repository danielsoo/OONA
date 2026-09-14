export type SchoolStatus = "active" | "pending" | "merged";

export type SchoolLocationSource = "verified" | "geocoded" | "submitted";

export type SchoolGeoLocation = {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  countryCode?: string;
  source: SchoolLocationSource;
};

/** Firestore `schools/{slug}` — canonical, self-serve-growable school registry */
export type SchoolDoc = {
  name: string;
  shortName: string;
  initials: string;
  slug: string;
  colorPrimary: string;
  colorSecondary: string;
  logoUrl?: string | null;
  /** Official campus coordinates. The map projects these automatically. */
  location?: SchoolGeoLocation | null;
  status: SchoolStatus;
  /** set when status === "merged" — canonical slug to redirect to */
  mergedIntoSlug?: string;
  /** uid of the uploader whose upload first introduced this school */
  proposedBy?: string;
  /** denormalized count of published works tagged with this school */
  workCount?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SchoolListItem = SchoolDoc & { id: string };

export type SchoolSuggestion = {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  logoUrl?: string | null;
  colorPrimary: string;
  colorSecondary: string;
  location?: SchoolGeoLocation | null;
  source?: "local" | "ror";
  externalId?: string;
};

export type SchoolStats = {
  workCount: number;
  movieCount: number;
  seriesCount: number;
  entertainmentCount: number;
};
