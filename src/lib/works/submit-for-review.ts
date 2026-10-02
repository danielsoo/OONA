import { uploadFileViaTus } from "@/lib/streamTusUpload";
import { fetchStagingFile } from "@/lib/works/work-video-staging";
import type { PromoTrimRange } from "@/lib/works/promo-clip";
import type { SubmitProgressPhase } from "@/lib/works/upload-progress";
import type { PromoFrameCrop } from "@/types/work";

export type { SubmitProgressPhase };

export type SubmitProgress = {
  phase: SubmitProgressPhase;
  percent: number;
};

type EditorSnapshot = {
  work: { streamStatus?: string; platformStatus?: string; videoStaging?: { prologuePath?: string } };
  prologue: { streamStatus?: string; platformStatus?: string } | null;
};

type PromoEditorSnapshot = {
  work: { streamStatus?: string };
  promo: { streamStatus?: string; platformStatus?: string } | null;
};

async function authJson<T>(
  token: string,
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; raw: string }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = {} as T;
  }
  return { ok: res.ok, status: res.status, data, raw };
}

async function pollEditorReady(
  token: string,
  workId: string,
  maxMs = 30 * 60 * 1000
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const [{ ok: prologueOk, data }, { ok: promoOk, data: promoData }] = await Promise.all([
      authJson<EditorSnapshot>(token, `/api/me/works/${workId}/prologue`, { method: "GET" }),
      authJson<PromoEditorSnapshot>(token, `/api/me/works/${workId}/promo`, { method: "GET" }),
    ]);
    const ok = prologueOk && promoOk;
    const workReady = data.work?.streamStatus === "ready";
    const promoReady = promoData.promo?.streamStatus === "ready";
    const hasPrologueStaging = Boolean(data.work?.videoStaging?.prologuePath?.trim());
    const prologueReady = !hasPrologueStaging || data.prologue?.streamStatus === "ready";
    if (ok && workReady && promoReady && prologueReady) {
      return;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("encoding_timeout");
}

/**
 * 스테이징된 본편·(선택)프롤로그·쇼츠를 Stream에 업로드한 뒤 심사 pending으로 전환.
 */
export async function submitStagedWorkForReview(opts: {
  token: string;
  workId: string;
  frameCrop: PromoFrameCrop;
  fullFile?: File | null;
  prologueFile?: File | null;
  promoFile?: File | null;
  promoTrimRange?: PromoTrimRange | null;
  includePrologue?: boolean;
  onProgress?: (p: SubmitProgress) => void;
}): Promise<void> {
  const { token, workId, frameCrop, onProgress, includePrologue = false } = opts;

  let fullFile = opts.fullFile ?? null;
  let prologueFile = opts.prologueFile ?? null;
  let promoFile = opts.promoFile ?? null;

  if (!fullFile || !promoFile || (includePrologue && !prologueFile)) {
    const snap = await authJson<{
      work: { videoStaging?: { fullPath: string; promoPath: string; prologuePath?: string } };
    }>(token, `/api/me/works/${workId}/prologue`, { method: "GET" });
    const staging = snap.data.work?.videoStaging;
    if (!staging?.fullPath || !staging?.promoPath) {
      throw new Error("staging_incomplete");
    }
    if (!fullFile) fullFile = await fetchStagingFile(staging.fullPath);
    if (!promoFile) promoFile = await fetchStagingFile(staging.promoPath);
    if (includePrologue && staging.prologuePath && !prologueFile) {
      prologueFile = await fetchStagingFile(staging.prologuePath);
    }
  }

  onProgress?.({ phase: "full_upload", percent: 0 });
  const fullSession = await authJson<{
    tusEndpoint?: string;
    message?: string;
    error?: string;
  }>(token, `/api/me/works/${workId}/full/stream-upload-url`, { method: "POST", body: "{}" });

  if (!fullSession.ok || !fullSession.data.tusEndpoint) {
    throw new Error(
      fullSession.data.message ?? (fullSession.raw.slice(0, 300) || "full_upload_url_failed")
    );
  }

  await uploadFileViaTus(fullFile, fullSession.data.tusEndpoint, {
    onProgress: (p) => onProgress?.({ phase: "full_upload", percent: Math.round(p * 100) }),
  });

  if (includePrologue && prologueFile) {
    onProgress?.({ phase: "prologue_upload", percent: 0 });
    const prologueSession = await authJson<{
      tusEndpoint?: string;
      message?: string;
      error?: string;
    }>(token, `/api/me/works/${workId}/prologue/stream-upload-url`, {
      method: "POST",
      body: "{}",
    });

    if (!prologueSession.ok || !prologueSession.data.tusEndpoint) {
      throw new Error(
        prologueSession.data.message ??
          (prologueSession.raw.slice(0, 300) || "prologue_upload_url_failed")
      );
    }

    await uploadFileViaTus(prologueFile, prologueSession.data.tusEndpoint, {
      onProgress: (p) =>
        onProgress?.({ phase: "prologue_upload", percent: Math.round(p * 100) }),
    });
  }

  onProgress?.({ phase: "promo_upload", percent: 0 });
  const promoSession = await authJson<{
    tusEndpoint?: string;
    message?: string;
    error?: string;
  }>(token, `/api/me/works/${workId}/promo/stream-upload-url`, {
    method: "POST",
    body: JSON.stringify({ frameCrop, trimRange: opts.promoTrimRange ?? null }),
  });

  if (!promoSession.ok || !promoSession.data.tusEndpoint) {
    throw new Error(
      promoSession.data.message ?? (promoSession.raw.slice(0, 300) || "promo_upload_url_failed")
    );
  }

  await uploadFileViaTus(promoFile, promoSession.data.tusEndpoint, {
    onProgress: (p) => onProgress?.({ phase: "promo_upload", percent: Math.round(p * 100) }),
  });

  onProgress?.({ phase: "encoding", percent: 0 });
  await pollEditorReady(token, workId);
  onProgress?.({ phase: "encoding", percent: 100 });

  const finalize = await authJson<{ ok?: boolean; message?: string; error?: string }>(
    token,
    `/api/me/works/${workId}/submit-for-review`,
    { method: "POST", body: "{}" }
  );
  if (!finalize.ok) {
    throw new Error(
      finalize.data.message ?? (finalize.raw.slice(0, 300) || "submit_failed")
    );
  }
  onProgress?.({ phase: "done", percent: 100 });
}
