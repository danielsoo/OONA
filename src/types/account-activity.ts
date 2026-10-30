import type { EngagementTarget } from "@/types/engagement";
import type { WorkSection } from "@/types/work";

export type AccountActivityItem = {
  ownerUid: string;
  workId: string;
  title: string;
  section: WorkSection;
  director?: string;
  target?: EngagementTarget;
  at?: unknown;
  thumbnailUrl?: string | null;
};
