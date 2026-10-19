export const PORTFOLIO_SHARE_VISIBILITY = ["active", "revoked"] as const;

export type PortfolioShareVisibility = (typeof PORTFOLIO_SHARE_VISIBILITY)[number];

export const PROFESSIONAL_FIELDS = ["director", "actor", "crew", "multi"] as const;

export type ProfessionalField = (typeof PROFESSIONAL_FIELDS)[number];

/** 전문 프로필 역할 칩 (복수 선택, multi 없음) */
export const PROFILE_ROLE_TAGS = ["director", "actor", "crew"] as const;

export type ProfileRoleTag = (typeof PROFILE_ROLE_TAGS)[number];

export function isProfessionalField(v: string): v is ProfessionalField {
  return (PROFESSIONAL_FIELDS as readonly string[]).includes(v);
}

export type PortfolioShareDoc = {
  token: string;
  title: string;
  includedWorkIds: string[];
  excludedWorkIds: string[];
  visibility: PortfolioShareVisibility;
  expiresAt?: unknown;
  viewCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type PortfolioWorkItem = {
  workId: string;
  ownerUid: string;
  title: string;
  description?: string;
  section?: string;
  director?: string;
  role: string;
  characterName?: string;
  streamUid?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  /** What they wrote about their part in it (their profile's note on the work). */
  profileNote?: string;
  /** The others credited on it, its owner first when that isn't them. */
  collaborators?: PortfolioCollaborator[];
};

export type PortfolioCollaborator = {
  uid: string;
  displayName: string;
  role: string;
  characterName?: string;
  avatarUrl?: string | null;
  profileHref: string | null;
};

export type PublicProfilePayload = {
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  schoolName?: string | null;
  headline?: string;
  bio?: string;
  openToCollaborate?: boolean;
  collaborationNote?: string;
  followerCount?: number;
  followingCount?: number;
  defaultDirectorName?: string;
};

export type PublicPortfolioPayload = {
  profile: PublicProfilePayload;
  shareTitle: string;
  works: PortfolioWorkItem[];
};
