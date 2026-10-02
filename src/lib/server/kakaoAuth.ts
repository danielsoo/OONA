export type KakaoUserProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
};

type KakaoMeResponse = {
  id?: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
};

export async function fetchKakaoProfile(accessToken: string): Promise<KakaoUserProfile | null> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as KakaoMeResponse;
  if (data.id == null) return null;

  return {
    id: String(data.id),
    email: data.kakao_account?.email?.trim() || null,
    displayName: data.kakao_account?.profile?.nickname?.trim() || null,
  };
}

/** Kakao REST login (used by the mobile app; the website uses the Kakao JS SDK). */
export function buildKakaoAuthorizeUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeKakaoCode(params: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}): Promise<string | null> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
  });
  if (params.clientSecret) body.set("client_secret", params.clientSecret);
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}
