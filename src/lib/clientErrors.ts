export type ApiErrorBody = {
  error?: string;
  message?: string;
  detail?: string;
};

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

/** @deprecated Use ApiErrorBody */
export type UploadApiErrorBody = ApiErrorBody;

const API_ERROR_I18N_KEYS: Record<string, string> = {
  school_verification_required: "schoolVerification.school_verification_required",
  school_enrollment_expired: "schoolVerification.school_enrollment_expired",
  school_review_required: "schoolVerification.school_review_required",
  school_unavailable: "schoolVerification.school_unavailable",
  stream_not_configured: "uploader.errorStreamNotConfigured",
  stream_api_failed: "uploader.errorStreamApiFailed",
  stream_storage_full: "uploader.errorStreamStorageFull",
  firestore_write_failed: "uploader.errorFirestoreWriteFailed",
  admin_not_configured: "uploader.errorAdminNotConfigured",
  unauthorized: "uploader.errorUnauthorized",
  deposit_required: "uploader.errorDepositRequired",
  deposit_disabled: "uploader.errorDepositDisabled",
  invalid_section: "errors.invalidSection",
  invalid_aspect_ratio: "errors.invalidAspectRatio",
  invalid_json: "errors.invalidJson",
  invalid_body: "errors.invalidBody",
  promo_required: "uploader.errorPromoTitleRequired",
  description_required: "uploader.errorDescriptionRequired",
  invalid_clip: "uploader.errorPromoClipInvalid",
  not_found: "errors.notFound",
  forbidden: "errors.forbidden",
};

export function messageFromUnknown(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "object" && error !== null) {
    const code = "code" in error && typeof (error as { code: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
    const msg =
      "message" in error && typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";
    if (code || msg) {
      return [code, msg].filter(Boolean).join(" — ");
    }
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") return "AbortError: request cancelled";
    const parts = [error.message, error.name !== "Error" ? error.name : ""].filter(Boolean);
    return parts.join(" — ") || "Unknown error";
  }
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  try {
    const json = JSON.stringify(error);
    if (json && json !== "{}") return json;
  } catch {
    /* ignore */
  }
  return String(error);
}

export function isLikelyNetworkError(error: unknown): boolean {
  const msg = messageFromUnknown(error).toLowerCase();
  return (
    error instanceof TypeError ||
    /failed to fetch|networkerror|network error|load failed|fetch failed|econnrefused|etimedout|timeout/i.test(
      msg
    )
  );
}

export async function readResponseJson<T extends Record<string, unknown>>(
  res: Response
): Promise<{ data: T; raw: string }> {
  const raw = await res.text().catch(() => "");
  if (!raw.trim()) return { data: {} as T, raw };
  try {
    return { data: JSON.parse(raw) as T, raw };
  } catch {
    return { data: {} as T, raw };
  }
}

export async function readApiErrorBody(res: Response): Promise<ApiErrorBody> {
  const text = await res.text().catch(() => "");
  const statusLine = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
  if (!text.trim()) return { message: statusLine };
  try {
    const parsed = JSON.parse(text) as ApiErrorBody;
    if (parsed && typeof parsed === "object") {
      return {
        error: typeof parsed.error === "string" ? parsed.error : undefined,
        message: typeof parsed.message === "string" ? parsed.message : undefined,
        detail: typeof parsed.detail === "string" ? parsed.detail : undefined,
      };
    }
  } catch {
    return { message: `${statusLine}\n${text.slice(0, 800)}` };
  }
  return { message: text.slice(0, 800) };
}

export function formatApiError(t: TranslateFn, status: number, body: ApiErrorBody): string {
  const code = body.error?.trim();
  const serverMsg = body.message?.trim();
  const detail = body.detail?.trim();
  const lines: string[] = [];

  if (code && API_ERROR_I18N_KEYS[code]) {
    lines.push(t(API_ERROR_I18N_KEYS[code]));
  }

  if (serverMsg) {
    const dup = lines.some((l) => l.includes(serverMsg));
    if (!dup) lines.push(serverMsg);
  }

  if (detail) {
    lines.push(`${t("common.errorDetail")}: ${detail}`);
  }

  if (lines.length > 0) {
    if (!lines.some((l) => l.includes(String(status)))) {
      lines.push(`(${t("common.errorHttpStatus", { status })})`);
    }
    return lines.join("\n");
  }

  if (code) {
    return t("uploader.errorWithCode", { code: `${code} · HTTP ${status}` });
  }

  return t("common.errorHttpStatus", { status });
}

export function formatClientError(
  t: TranslateFn,
  error: unknown,
  options?: { titleKey?: string }
): string {
  const title = options?.titleKey ? t(options.titleKey) : t("common.errorOccurred");
  const lines = [title];

  if (isLikelyNetworkError(error)) {
    lines.push(t("common.errorNetwork"));
  }

  const detail = messageFromUnknown(error);
  if (detail && !lines.some((l) => l.includes(detail))) {
    lines.push(`${t("common.errorDetail")}: ${detail}`);
  }

  return lines.join("\n");
}

export function formatStreamUploadError(
  t: TranslateFn,
  status: number,
  bodyText: string
): string {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return `${t("uploader.errorStreamFailed")}\n${t("common.errorHttpStatus", { status })}`;
  }
  try {
    const json = JSON.parse(trimmed) as { errors?: { message?: string }[]; error?: string; message?: string };
    const messages: string[] = [t("uploader.errorStreamFailed")];
    if (Array.isArray(json.errors)) {
      for (const item of json.errors) {
        if (item?.message) messages.push(item.message);
      }
    }
    if (json.message) messages.push(json.message);
    if (json.error && typeof json.error === "string") messages.push(json.error);
    if (messages.length === 1) messages.push(trimmed.slice(0, 500));
    messages.push(`(${t("common.errorHttpStatus", { status })})`);
    return messages.join("\n");
  } catch {
    return `${t("uploader.errorStreamFailed")}\n${t("common.errorDetail")}: ${trimmed.slice(0, 500)}\n(${t("common.errorHttpStatus", { status })})`;
  }
}

/** @deprecated Use formatApiError */
export const formatUploadApiError = formatApiError;
