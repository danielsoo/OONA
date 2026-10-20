import { NextResponse } from "next/server";
import { getStreamEmbedUrl, getStreamVideo, resolvePlaybackUrl } from "@/lib/cloudflare/stream";
import { resolveWorkCreditDisplayName } from "@/lib/credit-display-name";
import { peopleProfileHref } from "@/lib/dm/peopleProfileHref";
import { listWorkCredits } from "@/lib/server/credits";
import {
  getDbOrNull,
  parsePrologueDoc,
  parseWorkDoc,
  prologueRef,
  worksCol,
} from "@/lib/server/works";
import { parseUserProfileDoc } from "@/lib/userAccess";
import type { PublicWorkCredit, PublicWorkWatch } from "@/types/watch";

type Params = { params: Promise<{ ownerUid: string; workId: string }> };

const WATCH_CACHE_TTL_MS = 5 * 60 * 1000;
const WATCH_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};
const watchPayloadCache = new Map<
  string,
  { expiresAt: number; payload: PublicWorkWatch }
>();

export async function GET(_request: Request, { params }: Params) {
  const { ownerUid, workId } = await params;
  const cacheKey = `${ownerUid}:${workId}`;
  const cached = watchPayloadCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, { headers: WATCH_CACHE_HEADERS });
  }

  const db = await getDbOrNull();
  if (!db) {
    return NextResponse.json({ error: "not_available", message: "서비스를 사용할 수 없습니다." }, { status: 503 });
  }

  const snap = await worksCol(db, ownerUid).doc(workId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not_found", message: "작품을 찾을 수 없습니다." }, { status: 404 });
  }

  const work = parseWorkDoc(workId, snap.data() as Record<string, unknown>);

  if (work.platformStatus !== "published") {
    return NextResponse.json({ error: "not_found", message: "공개된 작품이 아닙니다." }, { status: 404 });
  }

  if (work.streamStatus !== "ready" || !work.streamUid) {
    return NextResponse.json(
      { error: "not_ready", message: "영상을 재생할 수 없습니다. 인코딩 중이거나 오류가 있습니다." },
      { status: 404 }
    );
  }

  const [playbackUrl, info, rawCredits, prologueSnap] = await Promise.all([
    resolvePlaybackUrl(work.streamUid),
    getStreamVideo(work.streamUid),
    listWorkCredits(db, ownerUid, workId),
    prologueRef(db, ownerUid, workId).get(),
  ]);

  const [credits, prologue] = await Promise.all([
    Promise.all(
      rawCredits
        .filter((c) => c.status === "accepted")
        .map(async (c): Promise<PublicWorkCredit | null> => {
          const userSnap = await db.collection("users").doc(c.userId).get();
          if (!userSnap.exists) return null;
          const profile = parseUserProfileDoc(userSnap.data() as Record<string, unknown>);
          const displayName = resolveWorkCreditDisplayName(
            {
              displayName: profile.displayName,
              defaultDirectorName: profile.defaultDirectorName,
              handle: profile.handle,
            },
            c.role
          );
          if (!displayName) return null;
          return {
            id: c.id,
            userId: c.userId,
            role: c.role,
            displayName,
            characterName: c.characterName,
            avatarUrl: profile.avatarUrl,
            profileHref: peopleProfileHref(profile.handle, c.userId),
          };
        })
    ).then((items) => items.filter((c): c is PublicWorkCredit => c != null)),
    (async (): Promise<PublicWorkWatch["prologue"]> => {
      if (!prologueSnap.exists) return undefined;
      const item = parsePrologueDoc(prologueSnap.data() as Record<string, unknown>);
      if (
        item.platformStatus !== "published" ||
        item.streamStatus !== "ready" ||
        !item.streamUid
      ) {
        return undefined;
      }
      return {
        playbackUrl: await resolvePlaybackUrl(item.streamUid),
        embedUrl: getStreamEmbedUrl(item.streamUid),
        durationSec: item.durationSec,
        title: item.title,
        description: item.description,
      };
    })(),
  ]);

  const payload: PublicWorkWatch = {
    workId,
    ownerUid,
    title: work.title,
    description: work.description,
    director: work.director,
    section: work.section,
    approvedCategory: work.approvedCategory,
    approvedTags: work.approvedTags ?? [],
    approvedAspectRatio: work.approvedAspectRatio,
    playbackUrl,
    embedUrl: getStreamEmbedUrl(work.streamUid),
    thumbnailUrl: info?.thumbnail,
    durationSec: info?.duration,
    credits,
    approvedSchoolId: work.approvedSchoolId,
    approvedSchoolName: work.approvedSchoolName,
    ...(prologue ? { prologue } : {}),
  };

  watchPayloadCache.set(cacheKey, {
    expiresAt: Date.now() + WATCH_CACHE_TTL_MS,
    payload,
  });
  return NextResponse.json(payload, { headers: WATCH_CACHE_HEADERS });
}
