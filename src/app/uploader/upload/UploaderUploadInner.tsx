"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppPageShell from "@/components/layout/AppPageShell";
import SectionLabel from "@/components/layout/SectionLabel";
import SubpageHeader from "@/components/layout/SubpageHeader";
import DirectorNameSetupModal from "@/components/uploader/DirectorNameSetupModal";
import UploaderPageLoading from "@/components/uploader/UploaderPageLoading";
import UploaderUploadForm from "@/components/uploader/UploaderUploadForm";
import UploaderHeaderActions from "@/components/uploader/UploaderHeaderActions";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { useDepositStatus } from "@/hooks/useDepositStatus";

export default function UploaderUploadInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDraftId = searchParams.get("draft")?.trim() || null;
  const draftId = useMemo(
    () => requestedDraftId ?? `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    [requestedDraftId]
  );
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslations();
  const { depositVerified, depositEnabled, checked } = useDepositStatus();
  const [defaultDirectorName, setDefaultDirectorName] = useState<string | null>(null);
  const [schoolNameHint, setSchoolNameHint] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showDirectorModal, setShowDirectorModal] = useState(false);

  const needsDeposit = depositEnabled && !depositVerified;

  useEffect(() => {
    if (!user || needsDeposit || authLoading || !checked) {
      setSettingsLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/me/uploader-settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as {
          defaultDirectorName?: string | null;
          schoolNameHint?: string | null;
        };
        if (cancelled) return;
        const name = data.defaultDirectorName?.trim() || null;
        setDefaultDirectorName(name);
        setSchoolNameHint(data.schoolNameHint?.trim() || null);
        setShowDirectorModal(!name);
      } catch {
        if (!cancelled) setShowDirectorModal(false);
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, needsDeposit, authLoading, checked]);

  if (authLoading || !checked || settingsLoading) {
    return <UploaderPageLoading />;
  }

  if (!user) {
    return (
      <AppPageShell>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-white">{t("uploader.uploadLoginRequired")}</p>
          <Link href="/login" className="text-xiio-accent hover:underline">
            {t("common.login")}
          </Link>
        </div>
      </AppPageShell>
    );
  }

  if (needsDeposit) {
    return (
      <AppPageShell>
        <SubpageHeader
          title={t("uploader.uploadDepositTitle")}
          description={t("uploader.uploadDepositBody")}
          backFallbackHref="/"
          endContent={<UploaderHeaderActions area="uploader-verification" />}
        />
        <div className="max-w-lg rounded-2xl border border-white/10 bg-xiio-surface p-8">
          <Link
            href="/uploader/verify"
            className="block w-full text-center py-3 rounded-lg bg-xiio-accent hover:bg-xiio-accent-hover text-white font-medium transition"
          >
            {t("uploader.uploadDepositCta")}
          </Link>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell className="!bg-[#080808] !pt-0" contentClassName="!max-w-none">
      <header className="mb-8 border-b border-white/[0.1] pb-7 pt-10 md:mb-10 md:pt-12">
        <SectionLabel>{t("uploader.uploadStudioLabel")}</SectionLabel>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-[44px] font-normal leading-none tracking-[-0.045em] text-[#f5f4f2] md:text-[64px]">
                {requestedDraftId ? "Refine your work." : "Bring your work to OONA."}
              </h1>
              {requestedDraftId ? (
                <span className="text-[13px] text-white/40">{t("uploader.draftLabel")}</span>
              ) : null}
            </div>
            <p className="mt-3 max-w-2xl text-[15px] font-light leading-relaxed text-white/55 md:text-[19px]">
              Upload the highest-quality master available.
            </p>
          </div>
          <UploaderHeaderActions area="upload-studio" />
        </div>
      </header>

      <DirectorNameSetupModal
        open={showDirectorModal}
        onSaved={(name) => {
          setDefaultDirectorName(name);
          setShowDirectorModal(false);
        }}
      />

      <UploaderUploadForm
        key={draftId}
        user={user}
        draftId={draftId}
        restoreDraft={Boolean(requestedDraftId)}
        initialDirector={defaultDirectorName}
        initialSchoolNameHint={schoolNameHint}
        onSuccess={() => {
          router.replace("/uploader/works?submitted=1");
        }}
        onError={() => undefined}
      />
    </AppPageShell>
  );
}
