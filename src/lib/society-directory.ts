import type { WorkCreditRole } from "@/types/credits";
import type { CreditsRollWork } from "@/types/creditsRoll";
import type { SocietyPerson } from "@/lib/societyTypes";
import type { ProfileRoleTag } from "@/types/portfolio";

/**
 * The Society directory: the people in Discover, joined with the confirmed
 * credits on published works (the same feed as the credits roll), so each
 * person comes with what they made, with whom, and at which school. Nothing
 * here is mock data.
 */

export type DirWork = {
  key: string;
  ownerUid: string;
  workId: string;
  title: string;
  stillUrl: string;
  schoolName: string | null;
};

export type DirCredit = { work: DirWork; role: WorkCreditRole; character: string | null };

export type DirGroup = "director" | "cast" | "crew";

export type DirPerson = {
  uid: string;
  name: string;
  /** For /people/<handle>; null when the person has no public profile. */
  handle: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  available: boolean;
  roleTags: ProfileRoleTag[];
  groups: DirGroup[];
  credits: DirCredit[];
  schools: string[];
  /** People credited on the same works, most shared first. */
  collaborators: string[];
};

export type Directory = { people: DirPerson[]; works: DirWork[] };

export function handleFromProfileHref(href: string | null | undefined): string | null {
  const match = href?.match(/^\/people\/([^/?#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return match[1]!;
  }
}

function groupsFor(roleTags: readonly ProfileRoleTag[], roles: readonly WorkCreditRole[]): DirGroup[] {
  const groups = new Set<DirGroup>();
  if (roleTags.includes("director") || roles.includes("director")) groups.add("director");
  if (roleTags.includes("actor") || roles.includes("actor")) groups.add("cast");
  if (roleTags.includes("crew") || roles.some((role) => role !== "director" && role !== "actor")) groups.add("crew");
  // Someone who hasn't said what they do yet sits with the crew, as in Discover.
  if (groups.size === 0) groups.add("crew");
  return [...groups];
}

/**
 * People in Discover, plus anyone credited on a work who has a public
 * profile; `excludeUid` (you) is left out. People are ordered by `rankOf`
 * (pass a per-visit rank, lib/visit-order, so the same names don't always lead).
 */
export function buildDirectory(
  people: readonly SocietyPerson[],
  works: readonly CreditsRollWork[],
  { excludeUid = null, rankOf }: { excludeUid?: string | null; rankOf: (uid: string) => number }
): Directory {
  const byUid = new Map<string, DirPerson>();
  for (const person of people) {
    if (person.uid === excludeUid || byUid.has(person.uid)) continue;
    byUid.set(person.uid, {
      uid: person.uid,
      name: person.displayName,
      handle: person.handle || null,
      avatarUrl: person.avatarUrl?.trim() || null,
      headline: person.headline?.trim() || null,
      bio: person.bio?.trim() || null,
      available: person.openToCollaborate,
      roleTags: person.roleTags,
      groups: [],
      credits: [],
      schools: [],
      collaborators: [],
    });
  }

  const dirWorks: DirWork[] = [];
  const shared = new Map<string, Map<string, number>>();
  for (const work of works) {
    const dirWork: DirWork = {
      key: `${work.ownerUid}:${work.workId}`,
      ownerUid: work.ownerUid,
      workId: work.workId,
      title: work.title,
      stillUrl: work.stillUrl,
      schoolName: work.schoolName?.trim() || null,
    };
    dirWorks.push(dirWork);
    const credited = new Set<string>();
    for (const credit of work.credits) {
      if (credit.userId === excludeUid) continue;
      let person = byUid.get(credit.userId);
      if (!person) {
        const handle = handleFromProfileHref(credit.profileHref);
        if (!handle) continue;
        person = {
          uid: credit.userId,
          name: credit.displayName,
          handle,
          avatarUrl: null,
          headline: null,
          bio: null,
          available: false,
          roleTags: [],
          groups: [],
          credits: [],
          schools: [],
          collaborators: [],
        };
        byUid.set(credit.userId, person);
      }
      if (!person.credits.some((c) => c.work.key === dirWork.key && c.role === credit.role)) {
        person.credits.push({ work: dirWork, role: credit.role, character: credit.characterName?.trim() || null });
      }
      if (dirWork.schoolName && !person.schools.includes(dirWork.schoolName)) person.schools.push(dirWork.schoolName);
      credited.add(person.uid);
    }
    for (const a of credited) {
      for (const b of credited) {
        if (a === b) continue;
        const row = shared.get(a) ?? new Map<string, number>();
        row.set(b, (row.get(b) ?? 0) + 1);
        shared.set(a, row);
      }
    }
  }

  const out = [...byUid.values()].map((person) => ({
    ...person,
    groups: groupsFor(person.roleTags, person.credits.map((c) => c.role)),
    collaborators: [...(shared.get(person.uid) ?? new Map<string, number>()).entries()]
      .sort((x, y) => y[1] - x[1] || rankOf(x[0]) - rankOf(y[0]))
      .map(([uid]) => uid),
  }));
  out.sort((a, b) => rankOf(a.uid) - rankOf(b.uid));
  return { people: out, works: dirWorks };
}

/** The role a person is best known for: their most frequent credit, else their profile tag. */
export function primaryRole(person: Pick<DirPerson, "credits" | "roleTags">): WorkCreditRole | "crew" {
  const counts = new Map<WorkCreditRole, number>();
  for (const credit of person.credits) counts.set(credit.role, (counts.get(credit.role) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) return top[0];
  if (person.roleTags.includes("director")) return "director";
  if (person.roleTags.includes("actor")) return "actor";
  return "crew";
}
