"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { normalizePortfolioShareUrl, portfolioSharePath } from "@/lib/portfolioShareUrl";
import { gradientForTitle } from "@/lib/works/catalog-ui";
import styles from "./PortfolioShare.module.css";

type EligibleWork = {
  workId: string;
  ownerUid: string;
  title: string;
  role: string;
  portfolioSubmissionHidden: boolean;
};

type ShareRow = {
  id: string;
  token: string;
  title: string;
  visibility: string;
  viewCount: number;
};

const workKey = (w: { ownerUid: string; workId: string }) => `${w.ownerUid}:${w.workId}`;

/**
 * Making a portfolio link, in one place: pick the works it shows (all of
 * them to start with), name it, and get the link — copied as it's made. The
 * links made before sit underneath, each with its views, to copy, open or
 * turn off. A link leaves out only what was unticked, so works added later
 * join it on their own.
 *
 * A work hidden from portfolio links on its own page (the old per-work
 * switch) starts unticked; ticking one of yours brings it back. One its
 * owner hid stays out, and says so.
 */
export default function PortfolioSharePanel({ defaultTitle, thumbs, heading = true }: { defaultTitle?: string; thumbs?: Record<string, string | null | undefined>; heading?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const copy = useUiCopy();
  const [works, setWorks] = useState<EligibleWork[] | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ url: string; copied: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);

  const authed = useCallback(async (init: RequestInit = {}) => {
    const token = await user!.getIdToken();
    return { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } };
  }, [user]);

  const load = useCallback(async (keepPicks = false) => {
    if (!user) return;
    try {
      const res = await fetch("/api/me/portfolio-shares", await authed());
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { shares?: ShareRow[]; eligibleWorks?: EligibleWork[] };
      const list = data.eligibleWorks ?? [];
      setWorks(list);
      setShares((data.shares ?? []).filter((s) => s.visibility === "active"));
      if (!keepPicks) setPicked(new Set(list.filter((w) => !w.portfolioSubmissionHidden).map(workKey)));
      setLoadErr(false);
    } catch {
      setLoadErr(true);
    }
  }, [authed, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const absolute = (urlOrPath: string) => normalizePortfolioShareUrl(urlOrPath, window.location.origin);
  const writeClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const lockedOut = (w: EligibleWork) => w.portfolioSubmissionHidden && w.ownerUid !== user?.uid;
  const choosable = (works ?? []).filter((w) => !lockedOut(w));
  const pickedCount = choosable.filter((w) => picked.has(workKey(w))).length;
  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const create = async () => {
    if (!user || !works || pickedCount === 0) return;
    setBusy(true);
    setErr(null);
    try {
      // Yours that were hidden from links on their own page, and are ticked now, come back.
      const revive = works.filter((w) => w.ownerUid === user.uid && w.portfolioSubmissionHidden && picked.has(workKey(w)));
      await Promise.all(revive.map(async (w) => fetch(`/api/me/works/${encodeURIComponent(w.workId)}/portfolio-visibility`, await authed({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioSubmissionHidden: false }),
      }))));
      const excludedWorkIds = choosable.filter((w) => !picked.has(workKey(w))).map((w) => w.workId);
      const res = await fetch("/api/me/portfolio-shares", await authed({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || defaultTitle?.trim() || copy("My portfolio"), excludedWorkIds }),
      }));
      const data = (await res.json()) as { shareUrl?: string; token?: string; message?: string };
      if (!res.ok || !(data.shareUrl || data.token)) {
        setErr(data.message ?? t("portfolio.share.createError"));
        return;
      }
      const url = absolute(data.shareUrl ?? portfolioSharePath(data.token!));
      setMade({ url, copied: await writeClipboard(url) });
      setTitle("");
      await load(true);
    } catch {
      setErr(t("portfolio.share.createError"));
    } finally {
      setBusy(false);
    }
  };

  const copyRow = async (share: ShareRow) => {
    if (await writeClipboard(absolute(portfolioSharePath(share.token)))) {
      setCopiedId(share.id);
      window.setTimeout(() => setCopiedId((id) => (id === share.id ? null : id)), 2000);
    }
  };

  const turnOff = async (share: ShareRow) => {
    if (!user) return;
    setConfirmOff(null);
    setShares((list) => list.filter((s) => s.id !== share.id));
    await fetch(`/api/me/portfolio-shares/${encodeURIComponent(share.id)}`, await authed({ method: "DELETE" }));
    await load(true);
  };

  return (
    <div className={styles.panel}>
      {heading ? (
        <header className={styles.head}>
          <p className={styles.eyebrow}><UiText text={"PORTFOLIO LINK"} /></p>
          <h2 id="portfolio-share-title" className={styles.title}><UiText text={"Share your portfolio"} /></h2>
          <p className={styles.lede}>
            <UiText text={"One link with your works, your part in each, and the people you made them with. Anyone can open it, no account needed."} />
          </p>
        </header>
      ) : null}

      {loadErr ? (
        <p className={styles.error} role="alert">{t("portfolio.share.loadError")} <button type="button" onClick={() => void load()}><UiText text={"Try again"} /></button></p>
      ) : works === null ? (
        <div className={styles.loading} aria-busy="true"><i /><i /><i /></div>
      ) : works.length === 0 ? (
        <div className={styles.empty}>
          <p><UiText text={"Your portfolio fills itself: every work you upload, and every one you're credited on, lands here."} /></p>
          <Link href="/uploader/upload"><UiText text={"Upload a work"} /></Link>
        </div>
      ) : made ? (
        <div className={styles.made} role="status">
          <p className={styles.madeTitle}>{made.copied ? copy("Your link is ready, and copied.") : copy("Your link is ready.")}</p>
          <p className={styles.url}>{made.url}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => void writeClipboard(made.url).then((ok) => ok && setMade({ ...made, copied: true }))}>
              {made.copied ? copy("Link copied") : copy("Copy link")}
            </button>
            <a href={made.url} target="_blank" rel="noopener noreferrer"><UiText text={"Open it"} /></a>
            <button type="button" onClick={() => setMade(null)}><UiText text={"Make another"} /></button>
          </div>
        </div>
      ) : (
        <div className={styles.form}>
          <div className={styles.listHead}>
            <span>{copy("{count} of {total} works", { count: pickedCount, total: choosable.length })}</span>
            <button type="button" onClick={() => setPicked(pickedCount === choosable.length ? new Set() : new Set(choosable.map(workKey)))}>
              {pickedCount === choosable.length ? copy("Clear all") : copy("Pick all")}
            </button>
          </div>
          <ul className={styles.works}>
            {works.map((w) => {
              const key = workKey(w);
              const locked = lockedOut(w);
              const roleKey = `watch.creditRole.${(w.role === "owner" ? "director" : w.role).toLowerCase()}`;
              const role = t(roleKey) === roleKey ? w.role : t(roleKey);
              const thumb = thumbs?.[key];
              return (
                <li key={key}>
                  <label className={`${styles.work} ${locked ? styles.locked : ""}`}>
                    <input type="checkbox" checked={!locked && picked.has(key)} disabled={locked} onChange={() => toggle(key)} />
                    <span className={styles.thumb} aria-hidden="true">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- stills come from any of the work hosts
                        <img src={thumb} alt="" loading="lazy" />
                      ) : (
                        <i style={{ background: gradientForTitle(w.title) }} />
                      )}
                    </span>
                    <span className={styles.workText}>
                      <strong>{w.title}</strong>
                      <small>{locked ? copy("Hidden by its owner") : role}</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}><UiText text={"Works you add later join the link on their own."} /></p>
          <label className={styles.field}>
            <span><UiText text={"Title, shown at the top of the page"} /></span>
            <input type="text" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle || copy("My portfolio")} />
          </label>
          {err ? <p className={styles.error} role="alert">{err}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busy || pickedCount === 0} onClick={() => void create()}>
              {busy ? copy("Making the link…") : copy("Make the link")}
            </button>
          </div>
        </div>
      )}

      {shares.length ? (
        <section className={styles.links} aria-label={copy("Your links")}>
          <h3><UiText text={"Your links"} /></h3>
          <ul>
            {shares.map((s) => (
              <li key={s.id}>
                <span className={styles.linkText}>
                  <strong>{s.title}</strong>
                  <small>{copy("{count} views", { count: s.viewCount })}</small>
                </span>
                {confirmOff === s.id ? (
                  <span className={styles.linkActions}>
                    <span className={styles.confirm}><UiText text={"Turn this link off for good?"} /></span>
                    <button type="button" className={styles.danger} onClick={() => void turnOff(s)}><UiText text={"Turn off"} /></button>
                    <button type="button" onClick={() => setConfirmOff(null)}><UiText text={"Keep it"} /></button>
                  </span>
                ) : (
                  <span className={styles.linkActions}>
                    <button type="button" onClick={() => void copyRow(s)}>{copiedId === s.id ? copy("Link copied") : copy("Copy link")}</button>
                    <a href={portfolioSharePath(s.token)} target="_blank" rel="noopener noreferrer"><UiText text={"Open it"} /></a>
                    <button type="button" onClick={() => setConfirmOff(s.id)}><UiText text={"Turn off"} /></button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** The panel over the page, from the profile's "Share my portfolio". */
export function PortfolioShareDialog({ open, onClose, defaultTitle, thumbs }: { open: boolean; onClose: () => void; defaultTitle?: string; thumbs?: Record<string, string | null | undefined> }) {
  const copy = useUiCopy();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="portfolio-share-title" tabIndex={-1}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={copy("Close")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <PortfolioSharePanel defaultTitle={defaultTitle} thumbs={thumbs} />
      </div>
    </div>
  );
}
