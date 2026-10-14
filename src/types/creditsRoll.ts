import type { WorkCreditRole } from "@/types/credits";
import type { WorkSection } from "@/types/work";

/** One accepted credit, as the credits home shows it. */
export type CreditsRollPerson = {
  userId: string;
  role: WorkCreditRole;
  displayName: string;
  characterName?: string;
  profileHref: string | null;
};

/** A published work and the people credited on it (GET /api/feed/credits-roll). */
export type CreditsRollWork = {
  workId: string;
  ownerUid: string;
  title: string;
  section: WorkSection;
  category?: string;
  schoolName?: string;
  /** A 16:9 frame of the work itself. */
  stillUrl: string;
  /** The work's promo clip (HLS), played muted on the side screens. */
  previewUrl: string | null;
  /** The full work (HLS), for the blind screening. */
  playbackUrl: string;
  credits: CreditsRollPerson[];
};
