import { NextResponse } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { verifyStreamWebhookSignature } from "@/lib/cloudflare/verify-stream-webhook";
import { getAdminDb } from "@/lib/server/firebase-admin";
import { mapWebhookStreamStatus } from "@/lib/works/constants";
import { finalizePromoStreamIfReady } from "@/lib/server/promo-stream-ready";
import { finalizePrologueStreamIfReady } from "@/lib/server/prologue-stream-ready";
import { materializePromoSourceClipIfReady } from "@/lib/server/promo-source-clip";
import {
  isModerationKind,
  scheduleContentModerationByStreamUid,
  scheduleContentModerationFromMeta,
} from "@/lib/server/moderation/trigger-content-moderation";
import { FieldValue, prologueRef, promoRef, worksCol } from "@/lib/server/works";

export const runtime = "nodejs";

type StreamWebhookPayload = {
  uid?: string;
  readyToStream?: boolean;
  status?: { state?: string };
  meta?: Record<string, string>;
};

function resolveStreamStatus(payload: StreamWebhookPayload) {
  if (payload.status?.state) return mapWebhookStreamStatus(payload.status.state);
  if (payload.readyToStream) return "ready" as const;
  return "processing" as const;
}

async function applyStreamStatus(
  db: Firestore,
  streamUid: string,
  streamStatus: ReturnType<typeof mapWebhookStreamStatus>,
  xiioUid: string,
  workId: string,
  kind: string
) {
  if (kind === "promo_source") {
    await promoRef(db, xiioUid, workId).set(
      {
        sourceStreamUid: streamUid,
        sourceStreamStatus: streamStatus,
        streamStatus: streamStatus === "error" ? "error" : "processing",
        ...(streamStatus === "error" ? { streamError: "promo_source_upload_failed" } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (streamStatus === "ready") {
      await materializePromoSourceClipIfReady(db, xiioUid, workId, streamUid);
    }
    return;
  }
  if (kind === "promo_revision") {
    await promoRef(db, xiioUid, workId).set(
      {
        "pendingRevision.streamUid": streamUid,
        "pendingRevision.streamStatus": streamStatus,
        "pendingRevision.updatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (streamStatus === "ready") {
      await finalizePromoStreamIfReady(db, xiioUid, workId, streamUid, "promo_revision");
    }
    return;
  }
  if (kind === "promo") {
    await promoRef(db, xiioUid, workId).set(
      { streamUid, streamStatus, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    if (streamStatus === "ready") {
      await finalizePromoStreamIfReady(db, xiioUid, workId, streamUid, "promo");
    }
    return;
  }
  if (kind === "prologue_revision") {
    await prologueRef(db, xiioUid, workId).set(
      {
        "pendingRevision.streamUid": streamUid,
        "pendingRevision.streamStatus": streamStatus,
        "pendingRevision.updatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (streamStatus === "ready") {
      await finalizePrologueStreamIfReady(db, xiioUid, workId, streamUid, "prologue_revision");
    }
    return;
  }
  if (kind === "prologue") {
    await prologueRef(db, xiioUid, workId).set(
      { streamUid, streamStatus, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    if (streamStatus === "ready") {
      await finalizePrologueStreamIfReady(db, xiioUid, workId, streamUid, "prologue");
    }
    return;
  }
  if (kind === "full_revision") {
    await worksCol(db, xiioUid).doc(workId).set(
      {
        "pendingRevision.streamUid": streamUid,
        "pendingRevision.streamStatus": streamStatus,
        "pendingRevision.updatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }
  await worksCol(db, xiioUid).doc(workId).set(
    { streamUid, streamStatus, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

async function applyByStreamUidLookup(
  db: Firestore,
  streamUid: string,
  streamStatus: ReturnType<typeof mapWebhookStreamStatus>
): Promise<boolean> {
  const workSnap = await db.collectionGroup("works").where("streamUid", "==", streamUid).limit(10).get();
  if (!workSnap.empty) {
    await Promise.all(
      workSnap.docs.map(async (doc) => {
        await doc.ref.update({ streamStatus, updatedAt: FieldValue.serverTimestamp() });
      })
    );
    return true;
  }

  const promoSnap = await db
    .collectionGroup("promoShort")
    .where("streamUid", "==", streamUid)
    .limit(10).get();

  if (!promoSnap.empty) {
    await Promise.all(
      promoSnap.docs.map(async (doc) => {
        await doc.ref.update({ streamStatus, updatedAt: FieldValue.serverTimestamp() });
        if (streamStatus === "ready") {
          const workId = doc.ref.parent.parent?.id;
          const ownerUid = doc.ref.parent.parent?.parent?.parent?.id;
          if (ownerUid && workId) {
            await finalizePromoStreamIfReady(db, ownerUid, workId, streamUid, "promo");
          }
        }
      })
    );
    return true;
  }

  const workRevSnap = await db
    .collectionGroup("works")
    .where("pendingRevision.streamUid", "==", streamUid)
    .limit(10)
    .get();
  if (!workRevSnap.empty) {
    await Promise.all(
      workRevSnap.docs.map((doc) =>
        doc.ref.update({
          "pendingRevision.streamStatus": streamStatus,
          "pendingRevision.updatedAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      )
    );
    return true;
  }

  const promoRevSnap = await db
    .collectionGroup("promoShort")
    .where("pendingRevision.streamUid", "==", streamUid)
    .limit(10)
    .get();
  if (!promoRevSnap.empty) {
    await Promise.all(
      promoRevSnap.docs.map(async (doc) => {
        await doc.ref.update({
          "pendingRevision.streamStatus": streamStatus,
          "pendingRevision.updatedAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (streamStatus === "ready") {
          const workId = doc.ref.parent.parent?.id;
          const ownerUid = doc.ref.parent.parent?.parent?.parent?.id;
          if (ownerUid && workId) {
            await finalizePromoStreamIfReady(db, ownerUid, workId, streamUid, "promo_revision");
          }
        }
      })
    );
    return true;
  }

  const prologueSnap = await db
    .collectionGroup("prologueShort")
    .where("streamUid", "==", streamUid)
    .limit(10)
    .get();
  if (!prologueSnap.empty) {
    await Promise.all(
      prologueSnap.docs.map(async (doc) => {
        await doc.ref.update({ streamStatus, updatedAt: FieldValue.serverTimestamp() });
        if (streamStatus === "ready") {
          const workId = doc.ref.parent.parent?.id;
          const ownerUid = doc.ref.parent.parent?.parent?.parent?.id;
          if (ownerUid && workId) {
            await finalizePrologueStreamIfReady(db, ownerUid, workId, streamUid, "prologue");
          }
        }
      })
    );
    return true;
  }

  const prologueRevSnap = await db
    .collectionGroup("prologueShort")
    .where("pendingRevision.streamUid", "==", streamUid)
    .limit(10)
    .get();
  if (!prologueRevSnap.empty) {
    await Promise.all(
      prologueRevSnap.docs.map(async (doc) => {
        await doc.ref.update({
          "pendingRevision.streamStatus": streamStatus,
          "pendingRevision.updatedAt": FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (streamStatus === "ready") {
          const workId = doc.ref.parent.parent?.id;
          const ownerUid = doc.ref.parent.parent?.parent?.parent?.id;
          if (ownerUid && workId) {
            await finalizePrologueStreamIfReady(db, ownerUid, workId, streamUid, "prologue_revision");
          }
        }
      })
    );
    return true;
  }

  return false;
}

/** 브라우저 GET 확인용 — Cloudflare는 POST만 보냄 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "Cloudflare Stream webhook endpoint. Cloudflare sends POST here when a video is ready. Register via PUT /accounts/{id}/stream/webhook.",
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET?.trim();

  if (secret) {
    const sigHeader =
      request.headers.get("webhook-signature") ??
      request.headers.get("Webhook-Signature");
    const verified = verifyStreamWebhookSignature(rawBody, sigHeader, secret);
    if (!verified.ok) {
      console.warn("[cloudflare-stream webhook] signature failed:", verified.reason);
      return NextResponse.json({ error: "invalid_signature", reason: verified.reason }, { status: 401 });
    }
  }

  let payload: StreamWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as StreamWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const streamUid = payload.uid;
  if (!streamUid) {
    return NextResponse.json({ received: true, handled: false, reason: "no_uid" });
  }

  const meta = payload.meta ?? {};
  const xiioUid = meta.xiio_uid;
  const workId = meta.xiio_work_id ?? meta.xiio_video_id;
  const kind = meta.xiio_kind ?? "full";
  const streamStatus = resolveStreamStatus(payload);

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  }

  if (xiioUid && workId) {
    await applyStreamStatus(db, streamUid, streamStatus, xiioUid, workId, kind);
    if (streamStatus === "ready" && isModerationKind(kind)) {
      void scheduleContentModerationFromMeta(db, streamUid, xiioUid, workId, kind);
    }
    return NextResponse.json({ received: true, handled: true, streamStatus, kind, workId, via: "meta" });
  }

  const found = await applyByStreamUidLookup(db, streamUid, streamStatus);
  if (found && streamStatus === "ready") {
    void scheduleContentModerationByStreamUid(db, streamUid);
  }
  return NextResponse.json({
    received: true,
    handled: found,
    streamStatus,
    via: found ? "streamUid_lookup" : "none",
  });
}
