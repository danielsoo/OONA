import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import * as tus from "tus-js-client";
import type { PromoTrimRange } from "@/lib/works/promo-clip";
import type { WorkCreditRole } from "@/types/credits";
import type { PromoFrameCrop, VideoAspectRatio, WorkSection } from "@/types/work";
import { apiFetch } from "~/lib/api";
import { storage } from "~/lib/firebase";

/**
 * The website's upload sequence (src/components/uploader/UploaderUploadForm.tsx
 * handleUpload + src/lib/works/submit-for-review.ts), with local file URIs
 * from the image picker instead of browser File objects.
 */

export type PickedMedia = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  /** Seconds (videos only). */
  duration: number;
};

export type CreditDraft = { userId: string; handle: string; displayName: string; role: WorkCreditRole };
export type InviteDraft = { email: string; role: WorkCreditRole };

export type SubmitPhase = "full_upload" | "prologue_upload" | "promo_upload" | "encoding" | "done";

const SAFE_VIDEO_EXT = ["mp4", "mov", "webm", "mkv"];
const SAFE_IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];
const TUS_CHUNK_SIZE = 50 * 1024 * 1024;

function extOf(name: string, allowed: string[], fallback: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return allowed.includes(ext) ? ext : fallback;
}

/** React Native's fetch turns a file:// URI into a native-backed Blob (not copied into JS memory). */
async function blobFromUri(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

async function uploadToStorage(
  path: string,
  media: PickedMedia,
  contentType: string,
  onProgress?: (ratio: number) => void
): Promise<void> {
  if (!storage) throw new Error("storage_not_configured");
  const blob = await blobFromUri(media.uri);
  const task = uploadBytesResumable(ref(storage, path), blob, { contentType });
  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => onProgress?.(snap.totalBytes > 0 ? snap.bytesTransferred / snap.totalBytes : 0),
      reject,
      () => resolve()
    );
  });
}

export async function createWork(body: {
  title: string;
  section: WorkSection;
  aspectRatio: VideoAspectRatio;
  uploadLength: number;
  description: string;
  director?: string;
  contentCategory?: string;
  tags?: string[];
  promoDraft: { title: string; description?: string };
  prologueDraft?: { title?: string; description?: string };
  credits: { userId: string; role: WorkCreditRole; sortOrder: number }[];
}): Promise<string> {
  const data = await apiFetch<{ workId?: string }>("/api/stream/upload-url", { method: "POST", auth: "required", json: body });
  if (!data.workId) throw new Error("upload_session_missing_work_id");
  return data.workId;
}

export async function uploadThumbnail(
  uid: string,
  workId: string,
  image: PickedMedia,
  onProgress?: (ratio: number) => void
): Promise<void> {
  const path = `users/${uid}/works/${workId}/promo-thumbnail.${extOf(image.fileName, SAFE_IMAGE_EXT, "jpg")}`;
  await uploadToStorage(path, image, image.mimeType || "image/jpeg", onProgress);
  const thumbnailUrl = await getDownloadURL(ref(storage!, path));
  await apiFetch(`/api/me/works/${workId}/promo-thumbnail`, { method: "PATCH", auth: "required", json: { thumbnailUrl } });
}

export async function uploadStagingVideo(
  uid: string,
  workId: string,
  kind: "full" | "prologue" | "promo",
  video: PickedMedia,
  onProgress?: (ratio: number) => void
): Promise<{ path: string; bytes: number; contentType: string }> {
  const path = `users/${uid}/works/${workId}/staging/${kind}.${extOf(video.fileName, SAFE_VIDEO_EXT, "mp4")}`;
  const contentType = video.mimeType || "video/mp4";
  await uploadToStorage(path, video, contentType, onProgress);
  return { path, bytes: video.fileSize, contentType };
}

export function patchStaging(workId: string, payload: Record<string, unknown>) {
  return apiFetch(`/api/me/works/${workId}/staging`, { method: "PATCH", auth: "required", json: payload });
}

export function sendCollabInvite(workId: string, invite: InviteDraft, locale: string) {
  return apiFetch<{ emailSent?: boolean; emailFallbackUrl?: string; message?: string }>(
    `/api/me/works/${encodeURIComponent(workId)}/collab-invites`,
    { method: "POST", auth: "required", json: { email: invite.email, role: invite.role, locale } }
  );
}

async function tusUpload(video: PickedMedia, endpoint: string, onProgress: (ratio: number) => void): Promise<void> {
  const blob = await blobFromUri(video.uri);
  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      uploadUrl: endpoint,
      chunkSize: TUS_CHUNK_SIZE,
      retryDelays: [0, 1000, 3000, 5000],
      onError: (error) => reject(error instanceof Error ? error : new Error(String(error))),
      onProgress: (sent, total) => total > 0 && onProgress(sent / total),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}

async function streamSession(workId: string, kind: "full" | "prologue" | "promo", body: unknown = {}): Promise<string> {
  const data = await apiFetch<{ tusEndpoint?: string }>(`/api/me/works/${workId}/${kind}/stream-upload-url`, {
    method: "POST",
    auth: "required",
    json: body,
  });
  if (!data.tusEndpoint) throw new Error(`${kind}_upload_url_failed`);
  return data.tusEndpoint;
}

async function waitForEncoding(workId: string, maxMs = 30 * 60 * 1000): Promise<void> {
  type PrologueSnap = { work?: { streamStatus?: string; videoStaging?: { prologuePath?: string } }; prologue?: { streamStatus?: string } | null };
  type PromoSnap = { promo?: { streamStatus?: string } | null };
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const [p, promo] = await Promise.all([
      apiFetch<PrologueSnap>(`/api/me/works/${workId}/prologue`, { auth: "required" }),
      apiFetch<PromoSnap>(`/api/me/works/${workId}/promo`, { auth: "required" }),
    ]);
    const hasPrologue = Boolean(p.work?.videoStaging?.prologuePath?.trim());
    if (
      p.work?.streamStatus === "ready" &&
      promo.promo?.streamStatus === "ready" &&
      (!hasPrologue || p.prologue?.streamStatus === "ready")
    ) {
      return;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("encoding_timeout");
}

/** Sends the staged videos to Cloudflare Stream, waits for encoding, then submits for review. */
export async function submitForReview(opts: {
  workId: string;
  full: PickedMedia;
  prologue: PickedMedia | null;
  promo: PickedMedia;
  frameCrop: PromoFrameCrop;
  promoTrimRange: PromoTrimRange | null;
  onProgress: (phase: SubmitPhase, ratio: number) => void;
}): Promise<void> {
  const { workId, onProgress } = opts;

  onProgress("full_upload", 0);
  await tusUpload(opts.full, await streamSession(workId, "full"), (r) => onProgress("full_upload", r));

  if (opts.prologue) {
    onProgress("prologue_upload", 0);
    await tusUpload(opts.prologue, await streamSession(workId, "prologue"), (r) => onProgress("prologue_upload", r));
  }

  onProgress("promo_upload", 0);
  const promoEndpoint = await streamSession(workId, "promo", { frameCrop: opts.frameCrop, trimRange: opts.promoTrimRange });
  await tusUpload(opts.promo, promoEndpoint, (r) => onProgress("promo_upload", r));

  onProgress("encoding", 0);
  await waitForEncoding(workId);
  onProgress("encoding", 1);

  await apiFetch(`/api/me/works/${workId}/submit-for-review`, { method: "POST", auth: "required", json: {} });
  onProgress("done", 1);
}

export type HandleSearchResult = { uid: string; handle: string; displayName: string };

export async function searchUsersByHandle(q: string): Promise<HandleSearchResult[]> {
  const data = await apiFetch<{ items?: HandleSearchResult[] }>(`/api/users/search-by-handle?q=${encodeURIComponent(q)}`, {
    auth: "required",
  });
  return data.items ?? [];
}
