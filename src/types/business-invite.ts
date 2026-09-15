export const BUSINESS_INVITE_DIRECTIONS = ["offer", "application"] as const;
export type BusinessInviteDirection = (typeof BUSINESS_INVITE_DIRECTIONS)[number];

export const BUSINESS_INVITE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "cancelled",
] as const;
export type BusinessInviteStatus = (typeof BUSINESS_INVITE_STATUSES)[number];

export type BusinessInviteDoc = {
  senderUid: string;
  recipientUid: string;
  direction: BusinessInviteDirection;
  message?: string;
  status: BusinessInviteStatus;
  /** empty = "all eligible works" (mirrors PortfolioShareDoc semantics) */
  attachedWorkIds: string[];
  excludedWorkIds: string[];
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
  threadId?: string;
  expiresAt: unknown;
  respondedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type BusinessInviteListItem = BusinessInviteDoc & {
  id: string;
  otherUid: string;
  otherHandle: string | null;
  otherDisplayName: string;
  otherAvatarUrl: string | null;
};

export type BusinessInviteCreateInput = {
  recipientUid?: string;
  recipientHandle?: string;
  direction: BusinessInviteDirection;
  message?: string;
  attachedWorkIds?: string[];
  excludedWorkIds?: string[];
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentContentType?: string;
};
