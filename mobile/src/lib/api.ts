import { API_BASE_URL } from "~/lib/config";
import { auth } from "~/lib/firebase";

/** Error thrown for non-2xx API responses; carries the server's `{error, message}` body. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  /** "required": fail without a signed-in user. "optional": send the token when signed in. */
  auth?: "required" | "optional" | "none";
  json?: unknown;
};

/**
 * Calls the website's Next.js API routes. Authenticated routes expect
 * `Authorization: Bearer <Firebase ID token>` (src/lib/server/api-auth.ts).
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth: authMode = "none", json, headers, ...init } = options;
  const finalHeaders = new Headers(headers);

  if (authMode !== "none") {
    const user = auth?.currentUser;
    if (user) {
      finalHeaders.set("Authorization", `Bearer ${await user.getIdToken()}`);
    } else if (authMode === "required") {
      throw new ApiError(401, "unauthorized", "Sign in required");
    }
  }

  let body: BodyInit | undefined;
  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: finalHeaders, body });
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const err = (data ?? {}) as { error?: string; message?: string };
    throw new ApiError(res.status, err.error ?? "request_failed", err.message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
