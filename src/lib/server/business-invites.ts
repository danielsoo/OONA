import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminTimestampToMillis } from "@/lib/admin/format-timestamp";
import { isBlocked } from "@/lib/server/blocks";
import { getOrCreateThread } from "@/lib/server/dm";
import { getUidByHandle } from "@/lib/server/handles";
import { createNotification } from "@/lib/server/notifications";
import { buildPublicPortfolio, listEligibleWorksForUser } from "@/lib/server/portfolio";
import { isProjectMember, parseProject, projectsCol } from "@/lib/server/projects";
import { addRoomMembers, createRoom } from "@/lib/server/rooms";
import { parseUserProfileDoc } from "@/lib/userAccess";
import type {
  BusinessInviteCreateInput,
  BusinessInviteDirection,
  BusinessInviteDoc,
  BusinessInviteListItem,
  BusinessInviteStatus,
} from "@/types/business-invite";
import { BUSINESS_INVITE_DIRECTIONS, BUSINESS_INVITE_STATUSES } from "@/types/business-invite";
import type { PortfolioShareDoc, PublicPortfolioPayload } from "@/types/portfolio";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LEN = 500;

export function businessInvitesCol(db: Firestore) {
  return db.collection("businessInvites");
}

export function isValidBusinessInviteDirection(v: string): v is BusinessInviteDirection {
  return (BUSINESS_INVITE_DIRECTIONS as readonly string[]).includes(v);
}

function parseStatus(v: unknown): BusinessInviteStatus {
  return (BUSINESS_INVITE_STATUSES as readonly string[]).includes(String(v))
    ? (v as BusinessInviteStatus)
    : "pending";
}

export function parseBusinessInvite(id: string, data: Record<string, unknown>): BusinessInviteDoc & { id: string } {
  return {
    id,
    senderUid: String(data.senderUid ?? ""),
    recipientUid: String(data.recipientUid ?? ""),
    direction: isValidBusinessInviteDirection(String(data.direction))
      ? (data.direction as BusinessInviteDirection)
      : "offer",
    message: data.message ? String(data.message) : undefined,
    status: parseStatus(data.status),
    attachedWorkIds: Array.isArray(data.attachedWorkIds) ? data.attachedWorkIds.map(String) : [],
    excludedWorkIds: Array.isArray(data.excludedWorkIds) ? data.excludedWorkIds.map(String) : [],
    attachmentUrl: data.attachmentUrl ? String(data.attachmentUrl) : undefined,
    attachmentFileName: data.attachmentFileName ? String(data.attachmentFileName) : undefined,
    attachmentContentType: data.attachmentContentType ? String(data.attachmentContentType) : undefined,
    threadId: data.threadId ? String(data.threadId) : undefined,
    projectId: data.projectId ? String(data.projectId) : undefined,
    projectTitle: data.projectTitle ? String(data.projectTitle) : undefined,
    role: data.role ? String(data.role) : undefined,
    permissions: data.permissions === "edit" || data.permissions === "manage" ? data.permissions : "view_comment",
    availability: data.availability ? String(data.availability) : undefined,
    location: data.location ? String(data.location) : undefined,
    compensation: data.compensation === "paid" || data.compensation === "unpaid" || data.compensation === "credit" ? data.compensation : "negotiable",
    budgetRange: data.budgetRange ? String(data.budgetRange) : undefined,
    expiresAt: data.expiresAt,
    respondedAt: data.respondedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function isExpired(expiresAt: unknown): boolean {
  const ms = adminTimestampToMillis(expiresAt);
  return ms != null && ms < Date.now();
}

export async function createBusinessInvite(
  db: Firestore,
  senderUid: string,
  input: BusinessInviteCreateInput
): Promise<{ ok: true; id: string } | { ok: false; code: string }> {
  if (!isValidBusinessInviteDirection(input.direction)) {
    return { ok: false, code: "direction_invalid" };
  }

  let recipientUid = input.recipientUid?.trim();
  if (!recipientUid && input.recipientHandle?.trim()) {
    recipientUid = (await getUidByHandle(db, input.recipientHandle)) ?? undefined;
  }
  if (!recipientUid) return { ok: false, code: "target_required" };
  if (recipientUid === senderUid) return { ok: false, code: "invite_self" };
  if (await isBlocked(db, senderUid, recipientUid)) return { ok: false, code: "blocked" };

  let projectTitle = input.projectTitle?.trim().slice(0, 120) || undefined;
  if (input.projectId) {
    const projectSnap = await projectsCol(db).doc(input.projectId).get();
    if (!projectSnap.exists) return { ok: false, code: "project_not_found" };
    const project = parseProject(projectSnap.id, projectSnap.data() as Record<string, unknown>);
    if (!isProjectMember(project, senderUid) || (project.ownerUid !== senderUid && project.memberPermissions[senderUid] !== "manage")) return { ok: false, code: "project_forbidden" };
    projectTitle = project.title;
  }

  const existing = await businessInvitesCol(db)
    .where("senderUid", "==", senderUid)
    .where("recipientUid", "==", recipientUid)
    .where("direction", "==", input.direction)
    .where("status", "==", "pending")
    .get();
  if (existing.docs.some((doc) => parseBusinessInvite(doc.id, doc.data() as Record<string, unknown>).projectId === input.projectId)) return { ok: false, code: "invite_duplicate_pending" };

  const eligible = await listEligibleWorksForUser(db, senderUid);
  const eligibleIds = new Set(eligible.map((w) => w.workId));
  const attachedWorkIds = (input.attachedWorkIds ?? []).filter((id) => eligibleIds.has(id));
  const excludedWorkIds = (input.excludedWorkIds ?? []).filter((id) => eligibleIds.has(id));

  const message = input.message?.trim().slice(0, MAX_MESSAGE_LEN) || undefined;
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const doc: Record<string, unknown> = {
    senderUid,
    recipientUid,
    direction: input.direction,
    status: "pending",
    attachedWorkIds,
    excludedWorkIds,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (message) doc.message = message;
  if (input.attachmentUrl) doc.attachmentUrl = input.attachmentUrl;
  if (input.attachmentFileName) doc.attachmentFileName = input.attachmentFileName;
  if (input.attachmentContentType) doc.attachmentContentType = input.attachmentContentType;
  if (input.projectId) doc.projectId = input.projectId;
  if (projectTitle) doc.projectTitle = projectTitle;
  if (input.role?.trim()) doc.role = input.role.trim().slice(0, 80);
  doc.permissions = input.permissions === "edit" || input.permissions === "manage" ? input.permissions : "view_comment";
  if (input.availability?.trim()) doc.availability = input.availability.trim().slice(0, 120);
  if (input.location?.trim()) doc.location = input.location.trim().slice(0, 120);
  doc.compensation = input.compensation === "paid" || input.compensation === "unpaid" || input.compensation === "credit" ? input.compensation : "negotiable";
  if (input.budgetRange?.trim()) doc.budgetRange = input.budgetRange.trim().slice(0, 120);

  const ref = await businessInvitesCol(db).add(doc);
  await createNotification(db, {
    recipientUid,
    type: "business_invite_received",
    actorUid: senderUid,
    inviteId: ref.id,
  });
  return { ok: true, id: ref.id };
}

async function enrichWithOtherProfile(
  db: Firestore,
  invite: BusinessInviteDoc & { id: string },
  otherUid: string
): Promise<BusinessInviteListItem> {
  const snap = await db.collection("users").doc(otherUid).get();
  const profile = snap.exists ? parseUserProfileDoc(snap.data() as Record<string, unknown>) : null;
  return {
    ...invite,
    otherUid,
    otherHandle: profile?.handle ?? null,
    otherDisplayName: profile?.displayName ?? "—",
    otherAvatarUrl: profile?.avatarUrl ?? null,
  };
}

async function listAndLazilyExpire(
  db: Firestore,
  field: "recipientUid" | "senderUid",
  uid: string
): Promise<(BusinessInviteDoc & { id: string })[]> {
  const snap = await businessInvitesCol(db).where(field, "==", uid).orderBy("createdAt", "desc").get();
  const rows: (BusinessInviteDoc & { id: string })[] = [];
  for (const doc of snap.docs) {
    let invite = parseBusinessInvite(doc.id, doc.data() as Record<string, unknown>);
    if (invite.status === "pending" && isExpired(invite.expiresAt)) {
      await doc.ref.update({ status: "expired", updatedAt: FieldValue.serverTimestamp() });
      invite = { ...invite, status: "expired" };
    }
    rows.push(invite);
  }
  return rows;
}

export async function listReceivedBusinessInvites(db: Firestore, uid: string): Promise<BusinessInviteListItem[]> {
  const rows = await listAndLazilyExpire(db, "recipientUid", uid);
  return Promise.all(rows.map((r) => enrichWithOtherProfile(db, r, r.senderUid)));
}

export async function listSentBusinessInvites(db: Firestore, uid: string): Promise<BusinessInviteListItem[]> {
  const rows = await listAndLazilyExpire(db, "senderUid", uid);
  return Promise.all(rows.map((r) => enrichWithOtherProfile(db, r, r.recipientUid)));
}

export async function acceptBusinessInvite(
  db: Firestore,
  inviteId: string,
  accepterUid: string
): Promise<{ ok: true; threadId: string; projectId?: string } | { ok: false; code: string }> {
  const ref = businessInvitesCol(db).doc(inviteId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, code: "not_found" };
  const invite = parseBusinessInvite(inviteId, snap.data() as Record<string, unknown>);

  if (invite.recipientUid !== accepterUid) return { ok: false, code: "forbidden" };
  if (invite.status !== "pending" || isExpired(invite.expiresAt)) {
    return { ok: false, code: "invalid_state" };
  }
  if (await isBlocked(db, invite.senderUid, invite.recipientUid)) {
    return { ok: false, code: "blocked" };
  }

  await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(ref);
    if (!freshSnap.exists) throw new Error("not_found");
    const fresh = parseBusinessInvite(inviteId, freshSnap.data() as Record<string, unknown>);
    if (fresh.status !== "pending" || isExpired(fresh.expiresAt)) throw new Error("invalid_state");
    tx.update(ref, { status: "accepted", respondedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });

  const threadResult = await getOrCreateThread(db, invite.senderUid, invite.recipientUid);
  if ("error" in threadResult) return { ok: false, code: threadResult.error };

  await ref.update({ threadId: threadResult.threadId, updatedAt: FieldValue.serverTimestamp() });

  if (invite.projectId) {
    const projectRef = projectsCol(db).doc(invite.projectId);
    const projectSnap = await projectRef.get();
    if (projectSnap.exists) {
      const project = parseProject(projectSnap.id, projectSnap.data() as Record<string, unknown>);
      if (isProjectMember(project, invite.senderUid)) {
        let roomId = project.roomId;
        if (roomId) {
          const addResult = await addRoomMembers(db, roomId, invite.senderUid, [invite.recipientUid]);
          if (!addResult.ok && addResult.code !== "members_required") roomId = undefined;
        }
        if (!roomId) {
          const room = await createRoom(db, invite.senderUid, project.title, [invite.recipientUid]);
          if (room.ok) roomId = room.roomId;
        }
        await projectRef.update({
          memberIds: FieldValue.arrayUnion(invite.recipientUid),
          [`memberRoles.${invite.recipientUid}`]: invite.role || "Collaborator",
          [`memberPermissions.${invite.recipientUid}`]: invite.permissions || "view_comment",
          ...(roomId ? { roomId } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
  await createNotification(db, {
    recipientUid: invite.senderUid,
    type: "business_invite_accepted",
    actorUid: invite.recipientUid,
    inviteId,
    threadId: threadResult.threadId,
  });
  return { ok: true, threadId: threadResult.threadId, projectId: invite.projectId };
}

export async function declineBusinessInvite(
  db: Firestore,
  inviteId: string,
  recipientUid: string
): Promise<{ ok: true } | { ok: false; code: string }> {
  const ref = businessInvitesCol(db).doc(inviteId);
  let senderUid = "";

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("not_found");
      const invite = parseBusinessInvite(inviteId, snap.data() as Record<string, unknown>);
      if (invite.recipientUid !== recipientUid) throw new Error("forbidden");
      if (invite.status !== "pending") throw new Error("invalid_state");
      senderUid = invite.senderUid;
      tx.update(ref, { status: "declined", respondedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid_state";
    return { ok: false, code: msg };
  }
  await createNotification(db, {
    recipientUid: senderUid,
    type: "business_invite_declined",
    actorUid: recipientUid,
    inviteId,
  });
  return { ok: true };
}

export async function cancelBusinessInvite(
  db: Firestore,
  inviteId: string,
  senderUid: string
): Promise<{ ok: true } | { ok: false; code: string }> {
  const ref = businessInvitesCol(db).doc(inviteId);

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("not_found");
      const invite = parseBusinessInvite(inviteId, snap.data() as Record<string, unknown>);
      if (invite.senderUid !== senderUid) throw new Error("forbidden");
      if (invite.status !== "pending") throw new Error("invalid_state");
      tx.update(ref, {
        status: "cancelled",
        respondedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_state";
    return { ok: false, code };
  }

  return { ok: true };
}

export async function getBusinessInviteWithPortfolio(
  db: Firestore,
  inviteId: string,
  callerUid: string
): Promise<{ ok: true; invite: BusinessInviteDoc & { id: string }; portfolio: PublicPortfolioPayload | null } | { ok: false; code: string }> {
  const snap = await businessInvitesCol(db).doc(inviteId).get();
  if (!snap.exists) return { ok: false, code: "not_found" };
  const invite = parseBusinessInvite(inviteId, snap.data() as Record<string, unknown>);
  if (invite.senderUid !== callerUid && invite.recipientUid !== callerUid) {
    return { ok: false, code: "forbidden" };
  }

  const syntheticShare: PortfolioShareDoc = {
    token: "",
    title: "",
    includedWorkIds: invite.attachedWorkIds,
    excludedWorkIds: invite.excludedWorkIds,
    visibility: "active",
    viewCount: 0,
  };
  const portfolio = await buildPublicPortfolio(db, invite.senderUid, syntheticShare);
  return { ok: true, invite, portfolio };
}
