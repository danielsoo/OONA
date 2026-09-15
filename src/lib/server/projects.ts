import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminTimestampToMillis } from "@/lib/admin/format-timestamp";
import { parseUserProfileDoc } from "@/lib/userAccess";
import { parseWorkDoc, resolveWorkListThumbnailUrl, worksCol } from "@/lib/server/works";
import type {
  ProjectDetail,
  ProjectDoc,
  ProjectListItem,
  ProjectMilestone,
  ProjectStatus,
} from "@/types/project";

const PROJECT_STATUSES = new Set<ProjectStatus>([
  "development",
  "in_production",
  "post_production",
  "complete",
]);

export function projectsCol(db: Firestore) {
  return db.collection("projects");
}

function parseMilestones(value: unknown): ProjectMilestone[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const title = String(row.title ?? "").trim();
    if (!id || !title) return [];
    return [{
      id,
      title: title.slice(0, 120),
      dueDate: typeof row.dueDate === "string" ? row.dueDate : null,
      complete: row.complete === true,
    }];
  });
}

export function parseProject(id: string, data: Record<string, unknown>): ProjectListItem {
  const memberIds = Array.isArray(data.memberIds)
    ? Array.from(new Set(data.memberIds.map(String))).slice(0, 50)
    : [];
  const rawRoles = data.memberRoles && typeof data.memberRoles === "object"
    ? data.memberRoles as Record<string, unknown>
    : {};
  const memberRoles = Object.fromEntries(
    Object.entries(rawRoles).map(([uid, role]) => [uid, String(role).slice(0, 80)])
  );
  const rawPermissions = data.memberPermissions && typeof data.memberPermissions === "object"
    ? data.memberPermissions as Record<string, unknown>
    : {};
  const memberPermissions = Object.fromEntries(Object.entries(rawPermissions).map(([uid, permission]) => [uid, permission === "manage" || permission === "edit" ? permission : "view_comment"])) as ProjectDoc["memberPermissions"];
  const rawStatus = String(data.status ?? "development") as ProjectStatus;
  return {
    id,
    title: String(data.title ?? "Untitled project").slice(0, 120),
    description: data.description ? String(data.description).slice(0, 1000) : undefined,
    ownerUid: String(data.ownerUid ?? ""),
    memberIds,
    memberRoles,
    memberPermissions,
    status: PROJECT_STATUSES.has(rawStatus) ? rawStatus : "development",
    category: data.category ? String(data.category).slice(0, 80) : undefined,
    workId: data.workId ? String(data.workId) : undefined,
    roomId: data.roomId ? String(data.roomId) : undefined,
    coverUrl: typeof data.coverUrl === "string" ? data.coverUrl : null,
    milestones: parseMilestones(data.milestones),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function isProjectMember(project: Pick<ProjectDoc, "ownerUid" | "memberIds">, uid: string) {
  return project.ownerUid === uid || project.memberIds.includes(uid);
}

export async function listProjectsForUser(db: Firestore, uid: string): Promise<ProjectListItem[]> {
  const snapshot = await projectsCol(db).where("memberIds", "array-contains", uid).get();
  return snapshot.docs
    .map((doc) => parseProject(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => (adminTimestampToMillis(b.updatedAt) ?? 0) - (adminTimestampToMillis(a.updatedAt) ?? 0));
}

export async function createProject(
  db: Firestore,
  ownerUid: string,
  input: { title?: string; description?: string; category?: string; workId?: string }
): Promise<{ ok: true; project: ProjectListItem } | { ok: false; code: string }> {
  const title = input.title?.trim().slice(0, 120) ?? "";
  if (!title) return { ok: false, code: "title_required" };

  let coverUrl: string | null = null;
  if (input.workId) {
    const workSnap = await worksCol(db, ownerUid).doc(input.workId).get();
    if (!workSnap.exists) return { ok: false, code: "work_not_found" };
    const work = parseWorkDoc(input.workId, workSnap.data() as Record<string, unknown>);
    coverUrl = await resolveWorkListThumbnailUrl(db, ownerUid, input.workId, work) ?? null;
  }

  const ref = projectsCol(db).doc();
  const doc: ProjectDoc = {
    title,
    description: input.description?.trim().slice(0, 1000) || undefined,
    ownerUid,
    memberIds: [ownerUid],
    memberRoles: { [ownerUid]: "Project owner" },
    memberPermissions: { [ownerUid]: "manage" },
    status: "development",
    category: input.category?.trim().slice(0, 80) || undefined,
    workId: input.workId || undefined,
    coverUrl,
    milestones: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  return { ok: true, project: { id: ref.id, ...doc } };
}

export async function getProjectDetail(
  db: Firestore,
  projectId: string,
  uid: string
): Promise<{ ok: true; project: ProjectDetail } | { ok: false; code: string }> {
  const snap = await projectsCol(db).doc(projectId).get();
  if (!snap.exists) return { ok: false, code: "not_found" };
  const project = parseProject(snap.id, snap.data() as Record<string, unknown>);
  if (!isProjectMember(project, uid)) return { ok: false, code: "forbidden" };
  const members = await Promise.all(project.memberIds.map(async (memberUid) => {
    const userSnap = await db.collection("users").doc(memberUid).get();
    const profile = userSnap.exists
      ? parseUserProfileDoc(userSnap.data() as Record<string, unknown>)
      : null;
    return {
      uid: memberUid,
      displayName: profile?.displayName ?? "OONA creator",
      handle: profile?.handle ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      role: project.memberRoles[memberUid] || (memberUid === project.ownerUid ? "Project owner" : "Collaborator"),
    };
  }));
  return { ok: true, project: { ...project, members } };
}

export async function updateProject(
  db: Firestore,
  projectId: string,
  uid: string,
  input: {
    title?: string;
    description?: string;
    status?: ProjectStatus;
    category?: string;
    milestones?: ProjectMilestone[];
  }
): Promise<{ ok: true } | { ok: false; code: string }> {
  const ref = projectsCol(db).doc(projectId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "not_found" };
  const project = parseProject(projectId, snap.data() as Record<string, unknown>);
  if (project.ownerUid !== uid) return { ok: false, code: "forbidden" };
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (typeof input.title === "string" && input.title.trim()) patch.title = input.title.trim().slice(0, 120);
  if (typeof input.description === "string") patch.description = input.description.trim().slice(0, 1000);
  if (input.status && PROJECT_STATUSES.has(input.status)) patch.status = input.status;
  if (typeof input.category === "string") patch.category = input.category.trim().slice(0, 80);
  if (Array.isArray(input.milestones)) patch.milestones = parseMilestones(input.milestones);
  await ref.update(patch);
  return { ok: true };
}
