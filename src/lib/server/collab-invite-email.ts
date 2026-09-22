import { buildCollabInviteUrl } from "@/lib/collabInviteUrl";
import type { CollabInviteDoc } from "@/types/collab-invite";

export type CollabInviteEmailSendReason = "not_configured" | "provider_error";

export type SendInviteEmailResult =
  | { sent: true }
  | {
      sent: false;
      reason: CollabInviteEmailSendReason;
      inviteUrl: string;
      hint?: string;
    };

function appOrigin(): string | undefined {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
}

export function resolveResendFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "XIIO <noreply@xiio.app>";
}

function isOnboardingResendFrom(from: string): boolean {
  return /onboarding@resend\.dev/i.test(from);
}

export async function sendCollabInviteEmail(
  invite: CollabInviteDoc,
  options?: { locale?: "ko" | "en" | "ja" }
): Promise<SendInviteEmailResult> {
  const inviteUrl = buildCollabInviteUrl(invite.token, appOrigin());
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveResendFromEmail();

  if (!apiKey) {
    console.info("[collab-invite] RESEND_API_KEY not set; invite link:", inviteUrl);
    return {
      sent: false,
      reason: "not_configured",
      inviteUrl,
      hint: "RESEND_API_KEY is not set",
    };
  }

  if (isOnboardingResendFrom(from)) {
    console.warn(
      "[collab-invite] RESEND_FROM_EMAIL uses onboarding@resend.dev — Resend only delivers to your account email. Use a verified custom domain for external recipients.",
      { to: invite.invitedEmail }
    );
  }

  const locale = options?.locale ?? "ko";
  const subject =
    locale === "en"
      ? `You're invited to collaborate on "${invite.workTitle}"`
      : locale === "ja" ? `「${invite.workTitle}」のクレジット登録への招待` : `"${invite.workTitle}" 작품 크레딧 초대`;
  const html =
    locale === "en"
      ? buildEnHtml(invite, inviteUrl)
      : locale === "ja" ? buildJaHtml(invite, inviteUrl) : buildKoHtml(invite, inviteUrl);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [invite.invitedEmail],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[collab-invite] Resend error:", res.status, body, {
        from,
        to: invite.invitedEmail,
      });
      const hint =
        process.env.NODE_ENV === "development"
          ? `Resend ${res.status}: ${body.slice(0, 200)}`
          : undefined;
      return { sent: false, reason: "provider_error", inviteUrl, hint };
    }
    return { sent: true };
  } catch (e) {
    console.error("[collab-invite] Resend fetch failed:", e, { from, to: invite.invitedEmail });
    const hint =
      e instanceof Error && process.env.NODE_ENV === "development" ? e.message : undefined;
    return { sent: false, reason: "provider_error", inviteUrl, hint };
  }
}

function buildKoHtml(invite: CollabInviteDoc, inviteUrl: string): string {
  const inviter = invite.inviterDisplayName || "XIIO 회원";
  const message = invite.message
    ? `<p style="color:#aaa;margin:16px 0;">${escapeHtml(invite.message)}</p>`
    : "";
  return `
    <div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 12px;">작품 크레딧 초대</h1>
      <p style="color:#ccc;line-height:1.6;">
        <strong>${escapeHtml(inviter)}</strong>님이 <strong>${escapeHtml(invite.workTitle)}</strong> 작품에
        크레딧으로 초대했습니다.
      </p>
      ${message}
      <p style="margin:24px 0;">
        <a href="${inviteUrl}" style="display:inline-block;background:#e50914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          초대 확인하기
        </a>
      </p>
      <p style="color:#888;font-size:12px;line-height:1.5;">
        XIIO에 가입한 뒤, 초대받은 이메일(${escapeHtml(invite.invitedEmail)})로 로그인하여 수락할 수 있습니다.
      </p>
    </div>
  `;
}

function buildEnHtml(invite: CollabInviteDoc, inviteUrl: string): string {
  const inviter = invite.inviterDisplayName || "A XIIO member";
  const message = invite.message
    ? `<p style="color:#aaa;margin:16px 0;">${escapeHtml(invite.message)}</p>`
    : "";
  return `
    <div style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 12px;">Collaboration credit invite</h1>
      <p style="color:#ccc;line-height:1.6;">
        <strong>${escapeHtml(inviter)}</strong> invited you to be credited on
        <strong>${escapeHtml(invite.workTitle)}</strong>.
      </p>
      ${message}
      <p style="margin:24px 0;">
        <a href="${inviteUrl}" style="display:inline-block;background:#e50914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          View invitation
        </a>
      </p>
      <p style="color:#888;font-size:12px;line-height:1.5;">
        Sign up or log in with the invited email (${escapeHtml(invite.invitedEmail)}) to accept.
      </p>
    </div>
  `;
}

function buildJaHtml(invite: CollabInviteDoc, inviteUrl: string): string {
  const inviter = escapeHtml(invite.inviterDisplayName || "OONAのメンバー");
  return `<div lang="ja" style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:24px;">
    <h1 style="font-size:20px;">クレジット登録への招待</h1>
    <p>${inviter}さんから、「${escapeHtml(invite.workTitle)}」のクレジット登録への招待が届きました。</p>
    ${invite.message ? `<p>${escapeHtml(invite.message)}</p>` : ""}
    <p><a href="${escapeHtml(inviteUrl)}" style="color:#80caff;">招待を確認する</a></p>
    <p>招待を承諾するには、${escapeHtml(invite.invitedEmail)}でOONAに登録するか、ログインしてください。</p>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
