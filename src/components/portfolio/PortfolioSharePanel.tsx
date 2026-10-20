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
  includedWorkIds?: string[];
  excludedWorkIds?: string[];
};

const workKey = (w: { ownerUid: string; workId: string }) => `${w.ownerUid}:${w.workId}`;
/** A work's own role, as credits name it (an owner's is directing). */
const roleOf = (w: EligibleWork) => (w.role === "owner" ? "director" : w.role);

/**
 * Making portfolio links, in one place. Each link is made for somewhere it
 * will be sent, so it carries exactly the works ticked for it — an editing
 * job gets the editing, a festival the films — and nothing else changes:
 * not the profile, not the other links, and works added later don't slip
 * into a link already sent. The role chips tick one kind of work in a click
 * and name the link after it. The links made before sit underneath, each
 * with how many works it shows and its views, to copy, open, change (the
 * same address, new works) or turn off.
 *
 * A credited work its owner hid from portfolio links stays out, and says so.
 */
export default function PortfolioSharePanel({ ownerName, thumbs, heading = true }: { ownerName?: string; thumbs?: Record<string, string | null | undefined>; heading?: boolean }) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const copy = useUiCopy();
  const [works, setWorks] = useState<EligibleWork[] | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  // The role the picks were last made by, for the link's suggested title.
  const [byRole, setByRole] = useState<string | null>(null);
  // A link being changed (null: making a new one).
  const [editing, setEditing] = useState<ShareRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ url: string; copied: boolean; count: number; saved: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const authed = useCallback(async (init: RequestInit = {}) => {
    const token = await user!.getIdToken();
    return { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` } };
  }, [user]);

  const lockedOut = useCallback((w: EligibleWork) => w.portfolioSubmissionHidden && w.ownerUid !== user?.uid, [user]);
  const allPicks = useCallback((list: EligibleWork[]) => new Set(list.filter((w) => !w.portfolioSubmissionHidden).map(workKey)), []);

  const load = useCallback(async (keepPicks = false) => {
    if (!user) return;
    try {
      const res = await fetch("/api/me/portfolio-shares", await authed());
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { shares?: ShareRow[]; eligibleWorks?: EligibleWork[] };
      const list = data.eligibleWorks ?? [];
      setWorks(list);
      setShares((data.shares ?? []).filter((s) => s.visibility === "active"));
      if (!keepPicks) setPicked(allPicks(list));
      setLoadErr(false);
    } catch {
      setLoadErr(true);
    }
  }, [allPicks, authed, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleLabel = (role: string) => {
    const key = `watch.creditRole.${role.toLowerCase()}`;
    return t(key) === key ? role : t(key);
  };
  const absolute = (urlOrPath: string) => normalizePortfolioShareUrl(urlOrPath, window.location.origin);
  const writeClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const choosable = (works ?? []).filter((w) => !lockedOut(w));
  const pickedWorks = choosable.filter((w) => picked.has(workKey(w)));
  const roles = [...new Set(choosable.map(roleOf))].map((role) => ({ role, count: choosable.filter((w) => roleOf(w) === role).length }));
  const name = ownerName?.trim();
  const suggestedTitle = name
    ? byRole ? copy("{name} — {role}", { name, role: roleLabel(byRole).toLowerCase() }) : copy("{name} — selected work", { name })
    : byRole ? roleLabel(byRole) : copy("My portfolio");

  const toggle = (key: string) => {
    setByRole(null);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const pickRole = (role: string) => {
    setByRole(role);
    setPicked(new Set(choosable.filter((w) => roleOf(w) === role).map(workKey)));
  };
  const pickAll = (all: boolean) => {
    setByRole(null);
    setPicked(all ? new Set(choosable.map(workKey)) : new Set());
  };

  // Changing a link: its works ticked (a link from before this, which only
  // left some out, shows what it shows now), its title in the field.
  const startEdit = (share: ShareRow) => {
    const included = share.includedWorkIds ?? [];
    const excluded = new Set(share.excludedWorkIds ?? []);
    setPicked(new Set(choosable.filter((w) => (included.length ? included.includes(w.workId) : !excluded.has(w.workId) && !w.portfolioSubmissionHidden)).map(workKey)));
    setTitle(share.title);
    setByRole(null);
    setEditing(share);
    setDone(null);
    setErr(null);
    // Back up to the form: the dialog's own top, or the panel's on the settings page.
    const dialog = top.current?.closest<HTMLElement>("[role=dialog]");
    if (dialog) dialog.scrollTo({ top: 0, behavior: "smooth" });
    else top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const stopEdit = () => {
    setEditing(null);
    setTitle("");
    setByRole(null);
    if (works) setPicked(allPicks(works));
  };

  const submit = async () => {
    if (!user || pickedWorks.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const body = JSON.stringify({ title: title.trim() || suggestedTitle, includedWorkIds: pickedWorks.map((w) => w.workId), excludedWorkIds: [] });
      if (editing) {
        const res = await fetch(`/api/me/portfolio-shares/${encodeURIComponent(editing.id)}`, await authed({ method: "PATCH", headers: { "Content-Type": "application/json" }, body }));
        if (!res.ok) {
          setErr(copy("Couldn't save the link."));
          return;
        }
        setDone({ url: absolute(portfolioSharePath(editing.token)), copied: false, count: pickedWorks.length, saved: true });
        setEditing(null);
      } else {
        const res = await fetch("/api/me/portfolio-shares", await authed({ method: "POST", headers: { "Content-Type": "application/json" }, body }));
        const data = (await res.json()) as { shareUrl?: string; token?: string; message?: string };
        if (!res.ok || !(data.shareUrl || data.token)) {
          setErr(data.message ?? t("portfolio.share.createError"));
          return;
        }
        const url = absolute(data.shareUrl ?? portfolioSharePath(data.token!));
        setDone({ url, copied: await writeClipboard(url), count: pickedWorks.length, saved: false });
      }
      setTitle("");
      setByRole(null);
      await load(true);
    } catch {
      setErr(editing ? copy("Couldn't save the link.") : t("portfolio.share.createError"));
    } finally {
      setBusy(false);
    }
  };

  const another = () => {
    setDone(null);
    if (works) setPicked(allPicks(works));
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
    if (editing?.id === share.id) stopEdit();
    setShares((list) => list.filter((s) => s.id !== share.id));
    await fetch(`/api/me/portfolio-shares/${encodeURIComponent(share.id)}`, await authed({ method: "DELETE" }));
    await load(true);
  };

  return (
    <div className={styles.panel} ref={top}>
      {heading ? (
        <header className={styles.head}>
          <p className={styles.eyebrow}><UiText text={"PORTFOLIO LINKS"} /></p>
          <h2 id="portfolio-share-title" className={styles.title}><UiText text={"Share your portfolio"} /></h2>
          <p className={styles.lede}>
            <UiText text={"Make a link for each place you send it, with only the works that fit: your editing for an editing job, your camera work for a DP role. Anyone can open it, no account needed, and your profile stays as it is."} />
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
      ) : done ? (
        <div className={styles.made} role="status">
          <p className={styles.madeTitle}>
            {done.saved ? copy("Saved. The same link now shows {count} works.", { count: done.count }) : done.copied ? copy("Your link is ready, and copied.") : copy("Your link is ready.")}
          </p>
          <p className={styles.url}>{done.url}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => void writeClipboard(done.url).then((ok) => ok && setDone({ ...done, copied: true }))}>
              {done.copied ? copy("Link copied") : copy("Copy link")}
            </button>
            <a href={done.url} target="_blank" rel="noopener noreferrer"><UiText text={"Open it"} /></a>
            <button type="button" onClick={another}><UiText text={"Make another"} /></button>
          </div>
        </div>
      ) : (
        <div className={styles.form}>
          {editing ? (
            <p className={styles.editing}>
              <span>{copy("Changing “{title}”", { title: editing.title })}</span>
              <button type="button" onClick={stopEdit}><UiText text={"Cancel"} /></button>
            </p>
          ) : null}
          {roles.length > 1 ? (
            <div className={styles.roles} role="group" aria-label={copy("Pick by role")}>
              <span><UiText text={"Pick by role"} /></span>
              {roles.map(({ role, count }) => (
                <button key={role} type="button" aria-pressed={byRole === role} className={byRole === role ? styles.roleOn : undefined} onClick={() => pickRole(role)}>
                  {roleLabel(role)} <small>{count}</small>
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.listHead}>
            <span>{copy("{count} of {total} works", { count: pickedWorks.length, total: choosable.length })}</span>
            <button type="button" onClick={() => pickAll(pickedWorks.length !== choosable.length)}>
              {pickedWorks.length === choosable.length ? copy("Clear all") : copy("Pick all")}
            </button>
          </div>
          <ul className={styles.works}>
            {works.map((w) => {
              const key = workKey(w);
              const locked = lockedOut(w);
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
                      <small>{locked ? copy("Hidden by its owner") : roleLabel(roleOf(w))}</small>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className={styles.note}><UiText text={"Only the works you tick are on this link. Your profile and your other links stay as they are."} /></p>
          <label className={styles.field}>
            <span><UiText text={"Title, shown at the top of the page"} /></span>
            <input type="text" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder={suggestedTitle} />
          </label>
          {err ? <p className={styles.error} role="alert">{err}</p> : null}
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busy || pickedWorks.length === 0} onClick={() => void submit()}>
              {editing ? (busy ? copy("Saving…") : copy("Save changes")) : busy ? copy("Making the link…") : copy("Make the link")}
            </button>
          </div>
        </div>
      )}

      {shares.length ? (
        <section className={styles.links} aria-label={copy("Your links")}>
          <h3><UiText text={"Your links"} /></h3>
          <ul>
            {shares.map((s) => {
              const count = s.includedWorkIds?.length ?? 0;
              return (
                <li key={s.id} className={editing?.id === s.id ? styles.linkEditing : undefined}>
                  <span className={styles.linkText}>
                    <strong>{s.title}</strong>
                    <small>
                      {count ? copy("{count} works", { count }) : copy("All works")} · {copy("{count} views", { count: s.viewCount })}
                    </small>
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
                      <button type="button" onClick={() => startEdit(s)}><UiText text={"Change works"} /></button>
                      <button type="button" onClick={() => setConfirmOff(s.id)}><UiText text={"Turn off"} /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** The panel over the page, from the profile's "Share my portfolio". */
export function PortfolioShareDialog({ open, onClose, ownerName, thumbs }: { open: boolean; onClose: () => void; ownerName?: string; thumbs?: Record<string, string | null | undefined> }) {
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
        <PortfolioSharePanel ownerName={ownerName} thumbs={thumbs} />
      </div>
    </div>
  );
}
