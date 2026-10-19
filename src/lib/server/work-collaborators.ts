import type { Firestore } from "firebase-admin/firestore";
import { resolveWorkCreditDisplayName } from "@/lib/credit-display-name";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { listWorkCredits } from "@/lib/server/credits";
import { isAccountDeleted, parseUserProfileDoc } from "@/lib/userAccess";
import type { WorkCreditRole } from "@/types/credits";

/** Someone else credited on a work: its owner, or a confirmed credit. */
export type WorkCollaborator = {
  uid: string;
  displayName: string;
  role: WorkCreditRole;
  characterName?: string;
  avatarUrl: string | null;
  profileHref: string | null;
};

/**
 * Who `uid` made each of these works with: each work's other confirmed
 * credits (as its watch page shows them) and its owner, in credit order.
 * Deleted accounts and people with no name to show are left out.
 */
export async function listWorkCollaborators(
  db: Firestore,
  uid: string,
  works: { ownerUid: string; workId: string }[]
): Promise<WorkCollaborator[][]> {
  const creditLists = await Promise.all(works.map((w) => listWorkCredits(db, w.ownerUid, w.workId).catch(() => [])));
  const others = works.map((w, i) => {
    const people: { userId: string; role: WorkCreditRole; characterName?: string }[] = [];
    for (const c of creditLists[i] ?? []) {
      if (c.status !== "accepted" || c.userId === uid || people.some((p) => p.userId === c.userId)) continue;
      people.push({ userId: c.userId, role: c.role, ...(c.characterName ? { characterName: c.characterName } : {}) });
    }
    if (w.ownerUid !== uid && !people.some((p) => p.userId === w.ownerUid)) people.unshift({ userId: w.ownerUid, role: "director" });
    return people;
  });
  const otherIds = [...new Set(others.flat().map((p) => p.userId))];
  const otherSnaps = otherIds.length > 0 ? await db.getAll(...otherIds.map((id) => db.collection("users").doc(id))) : [];
  const otherProfiles = new Map(
    otherSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, parseUserProfileDoc(snap.data() as Record<string, unknown>)])
  );
  return others.map((people) =>
    people.flatMap((p) => {
      const other = otherProfiles.get(p.userId);
      if (!other || isAccountDeleted(other)) return [];
      const displayName = resolveWorkCreditDisplayName(
        { displayName: other.displayName, defaultDirectorName: other.defaultDirectorName, handle: other.handle },
        p.role
      );
      if (!displayName) return [];
      return [{
        uid: p.userId,
        displayName,
        role: p.role,
        ...(p.characterName ? { characterName: p.characterName } : {}),
        avatarUrl: other.avatarUrl ?? null,
        profileHref: peopleProfileHref(other.handle, p.userId),
      }];
    })
  );
}
