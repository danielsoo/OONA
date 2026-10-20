"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import UiText from "@/components/i18n/UiText";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { isDemoVisit } from "@/lib/demo-flags";

type MemberAccessKind = "active" | "no_profile" | "deleted" | "error";

const ACCESS_RETRIES = 3;
const ACCESS_RETRY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMemberAccess(
  user: NonNullable<ReturnType<typeof useAuth>["user"]>
): Promise<{ kind: MemberAccessKind; ok: boolean }> {
  const token = await user.getIdToken();
  const res = await fetch("/api/me/member-access", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { kind: "error", ok: false };
  const data = (await res.json()) as { kind?: MemberAccessKind };
  const kind = data.kind ?? "no_profile";
  if (kind === "active" || kind === "no_profile" || kind === "deleted") {
    return { kind, ok: true };
  }
  return { kind: "no_profile", ok: true };
}

export default function UploaderMemberGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslations();
  const [kind, setKind] = useState<MemberAccessKind | null>(null);
  const [checked, setChecked] = useState(false);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    // The demo is for looking around: nothing is uploaded, so its uploader says so.
    if (isDemoVisit()) {
      setDemo(true);
      return;
    }
    if (authLoading) return;

    if (!user) {
      setKind(null);
      setChecked(true);
      return;
    }

    let cancelled = false;
    setChecked(false);

    void (async () => {
      let last: { kind: MemberAccessKind; ok: boolean } = { kind: "error", ok: false };
      for (let attempt = 0; attempt < ACCESS_RETRIES; attempt++) {
        if (cancelled) return;
        try {
          last = await fetchMemberAccess(user);
          if (last.ok) break;
        } catch {
          last = { kind: "error", ok: false };
        }
        if (last.ok) break;
        if (attempt < ACCESS_RETRIES - 1) await sleep(ACCESS_RETRY_MS * (attempt + 1));
      }

      if (cancelled) return;
      setKind(last.kind);
      if (last.ok && last.kind === "no_profile") {
        router.replace("/signup");
      }
      setChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (demo) {
    return (
      <main className="min-h-screen bg-xiio-bg flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-white"><UiText text="Uploading isn't part of the demo." /></h1>
        <p className="text-xiio-muted text-sm max-w-md">
          <UiText text="Everything here is made up, so nothing gets uploaded. Look around the films, schools and Society instead." />
        </p>
        <Link href="/" className="text-xiio-accent hover:underline text-sm"><UiText text="Back to home" /></Link>
      </main>
    );
  }

  if (authLoading || (user && !checked)) {
    return (
      <main className="min-h-screen bg-xiio-bg flex items-center justify-center text-white">
        <p className="text-xiio-muted">{t("common.loading")}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-xiio-bg flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-white">{t("uploader.uploadLoginRequired")}</p>
        <Link href="/login" className="text-xiio-accent hover:underline">
          {t("common.login")}
        </Link>
      </main>
    );
  }

  if (kind === "deleted") {
    return (
      <main className="min-h-screen bg-xiio-bg flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold text-white">{t("uploader.profileRequiredTitle")}</h1>
        <p className="text-xiio-muted text-sm text-center max-w-md">{t("uploader.accountDeletedBody")}</p>
        <Link href="/" className="text-xiio-accent hover:underline text-sm">
          {t("common.goHome")}
        </Link>
      </main>
    );
  }

  if (kind === "error") {
    return (
      <main className="min-h-screen bg-xiio-bg flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-xiio-muted text-sm text-center max-w-md">{t("auth.signup.profileConnectionError")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm px-4 py-2 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white transition"
        >
          {t("common.retry")}
        </button>
      </main>
    );
  }

  if (kind === "no_profile") {
    return (
      <main className="min-h-screen bg-xiio-bg flex items-center justify-center text-white">
        <p className="text-xiio-muted">{t("common.loading")}</p>
      </main>
    );
  }

  if (kind !== "active") {
    return (
      <main className="min-h-screen bg-xiio-bg flex items-center justify-center text-white">
        <p className="text-xiio-muted">{t("common.loading")}</p>
      </main>
    );
  }

  return <>{children}</>;
}
