export type ProjectStatus = "development" | "in_production" | "post_production" | "complete";

export type ProjectMember = {
  uid: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  role: string;
};

export type ProjectMilestone = {
  id: string;
  title: string;
  dueDate?: string | null;
  complete: boolean;
};

export type ProjectDoc = {
  title: string;
  description?: string;
  ownerUid: string;
  memberIds: string[];
  memberRoles: Record<string, string>;
  memberPermissions: Record<string, "view_comment" | "edit" | "manage">;
  status: ProjectStatus;
  category?: string;
  workId?: string;
  roomId?: string;
  coverUrl?: string | null;
  milestones: ProjectMilestone[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ProjectListItem = ProjectDoc & {
  id: string;
};

export type ProjectDetail = ProjectListItem & {
  members: ProjectMember[];
};
