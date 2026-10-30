"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import ProfileConstellation, { type ConstellationWork } from "@/components/society/ProfileConstellation";
import { displayLines, PROFILE_SKY, PROFILE_SKY_POSITION } from "@/lib/profileHeroLook";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { formatCompactStat } from "@/lib/formatStat";
import { getUserProfile } from "@/lib/userProfile";
import { gradientForTitle } from "@/lib/works/catalog-ui";
import type { PortfolioWorkItem, PublicPortfolioPayload } from "@/types/portfolio";
import profile from "@/components/society/EditorialProfile.module.css";
import styles from "./Portfolio.module.css";

/** How many of a work's people its card names before "+N". */
const NAMED = 3;

const workAnchor = (i: number) => `work-${i + 1}`;

/**
 * A shared portfolio (/p/<token>): the page someone sends to a director, a
 * casting call or a school, read by people who may never have seen OONA. It
 * is their profile's night sky with the works laid out as case studies —
 * what they did on each, the film itself, and who they made it with — and,
 * at the foot, the way to make one like it.
 */
export default function PortfolioView({ data, profileHref }: { data: PublicPortfolioPayload; profileHref: string }) {
  const copy = useUiCopy();
  const { t } = useTranslations();
  const { profile: person, works } = data;
  const name = person.displayName || person.handle;
  const lines = displayLines(name);
  const [copied, setCopied] = useState(false);

  const roleLabel = (role: string) => {
    const key = `watch.creditRole.${role.toLowerCase()}`;
    const label = t(key);
    return label === key ? role : label;
  };
  const constellation: ConstellationWork[] = works.map((work, i) => ({
    key: `${work.ownerUid}:${work.workId}`,
    title: work.title,
    role: roleLabel(work.role),
    watchPath: `#${workAnchor(i)}`,
    people: (work.collaborators ?? []).map((c) => ({ uid: c.uid, name: c.displayName, role: c.characterName ?? roleLabel(c.role), href: c.profileHref })),
  }));
  const people = new Set(works.flatMap((w) => (w.collaborators ?? []).map((c) => c.uid))).size;
  const role = [person.headline?.trim(), person.schoolName?.trim()].filter(Boolean).join(" · ");

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <main className={profile.page}>
      <section className={profile.hero} data-society-hero="">
        <div className={profile.heroSky} aria-hidden="true">
          <Image src={PROFILE_SKY} alt="" fill priority unoptimized sizes="100vw" style={{ objectFit: "cover", objectPosition: PROFILE_SKY_POSITION }} />
        </div>
        <div className={profile.heroInner}>
          <div className={profile.backRow}>
            <span className={styles.shareTitle}>{data.shareTitle}</span>
            <span>{copy("PORTFOLIO")}</span>
          </div>
          <div className={profile.heroGrid}>
            <div>
              <p className={profile.eyebrow}><UiText text={"A portfolio on OONA"} /></p>
              <h1 className={profile.name}>{lines.map((line) => <span key={line}>{line}</span>)}</h1>
              <p className={profile.handleLine}>@{person.handle}{role ? <span className={profile.role}>{role}</span> : null}</p>
              {person.bio?.trim() ? <p className={profile.bio}>{person.bio}</p> : null}
              {person.openToCollaborate ? (
                <p className={profile.badges}>
                  <span className={profile.badge}><UiText text={"Open to work"} /></span>
                  {person.collaborationNote?.trim() ? <span className={styles.badgeNote}>{person.collaborationNote}</span> : null}
                </p>
              ) : null}
              <div className={profile.heroActions}>
                {works.length ? <a className={profile.primary} href="#work"><UiText text={"See the work"} /></a> : null}
                <Link href={profileHref}><UiText text={"Contact on OONA"} /></Link>
                <button type="button" onClick={copyLink} aria-live="polite">
                  {copied ? copy("Link copied") : copy("Copy link")}
                </button>
              </div>
            </div>
            <ProfileConstellation name={name} seed={person.handle} avatarUrl={person.avatarUrl} works={constellation} />
          </div>
          <div className={`${profile.stats} ${styles.stats}`}>
            <span><b>{formatCompactStat(works.length)}</b><UiText text={"Works"} /></span>
            <span><b>{formatCompactStat(people)}</b><UiText text={"People worked with"} /></span>
            <span><b>{formatCompactStat(person.followerCount ?? 0)}</b><UiText text={"Followers"} /></span>
          </div>
        </div>
      </section>

      <div className={profile.inner}>
        <section id="work" className={`${profile.worksSection} ${styles.works}`}>
          <header>
            <div>
              <p>{copy("SELECTED WORK")}</p>
              <h2><UiText text={"What they made, and with whom"} /></h2>
            </div>
          </header>
          {works.length ? (
            <ol className={styles.cases}>
              {works.map((work, i) => (
                <WorkCase key={`${work.ownerUid}:${work.workId}`} work={work} index={i} roleLabel={roleLabel} />
              ))}
            </ol>
          ) : (
            <div className={profile.emptyWorks}><p><UiText text={"Nothing in this portfolio yet."} /></p></div>
          )}
        </section>

        <PortfolioInvite />
      </div>
    </main>
  );
}

/** One work, as a case study: the film, what they did on it, and who else made it. */
function WorkCase({ work, index, roleLabel }: { work: PortfolioWorkItem; index: number; roleLabel: (role: string) => string }) {
  const copy = useUiCopy();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const crew = work.collaborators ?? [];
  const director = work.role !== "director" ? crew.find((c) => c.role === "director") : undefined;
  const named = crew.slice(0, NAMED).map((c) => c.displayName).join(", ");
  return (
    <li id={workAnchor(index)} className={styles.case}>
      <div className={styles.frame}>
        {playing && work.playbackUrl ? (
          <video src={work.playbackUrl} controls autoPlay playsInline />
        ) : (
          <>
            {work.thumbnailUrl && !failed ? (
              // eslint-disable-next-line @next/next/no-img-element -- stills come from any of the work hosts
              <img src={work.thumbnailUrl} alt="" loading={index === 0 ? "eager" : "lazy"} onError={() => setFailed(true)} />
            ) : (
              <i style={{ background: gradientForTitle(work.title) }} />
            )}
            {work.playbackUrl ? (
              <button type="button" className={styles.play} onClick={() => setPlaying(true)} aria-label={copy("Play {title}", { title: work.title })}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
                <UiText text={"Play"} />
              </button>
            ) : null}
          </>
        )}
      </div>
      <div className={styles.caseText}>
        <p className={styles.caseIndex}>{String(index + 1).padStart(2, "0")}</p>
        <h3 className={styles.caseTitle}>{work.title}</h3>
        <p className={styles.caseRole}>
          <span>{roleLabel(work.role)}</span>
          {work.characterName ? <em>“{work.characterName}”</em> : null}
        </p>
        {director ? <p className={styles.caseMeta}>{copy("Directed by {name}", { name: director.displayName })}</p> : null}
        {work.profileNote?.trim() ? <p className={styles.note}>{work.profileNote}</p> : null}
        {work.description?.trim() ? <p className={styles.desc}>{work.description}</p> : null}
        {crew.length ? (
          <details className={styles.credits}>
            <summary>
              <span>{copy("Made with {names}", { names: named })}{crew.length > NAMED ? ` ${copy("+{count} more", { count: crew.length - NAMED })}` : ""}</span>
              <small><UiText text={"Full credits"} /></small>
            </summary>
            <ul>
              {crew.map((c) => (
                <li key={c.uid}>
                  {c.profileHref ? <Link href={c.profileHref}>{c.displayName}</Link> : <span>{c.displayName}</span>}
                  <small>{roleLabel(c.role)}{c.characterName ? ` · ${c.characterName}` : ""}</small>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {!work.playbackUrl ? <p className={styles.soon}><UiText text={"The film itself can't be played here yet."} /></p> : null}
      </div>
    </li>
  );
}

/**
 * The foot of every shared portfolio: someone reading it may want one too.
 * Signed in, it goes to making their own link; otherwise to joining.
 */
export function PortfolioInvite() {
  const { user } = useAuth();
  const [ownHref, setOwnHref] = useState<string | null>(null);
  useEffect(() => {
    if (!user) {
      setOwnHref(null);
      return;
    }
    let live = true;
    void getUserProfile(user.uid).then((me) => {
      if (live) setOwnHref(me?.handle ? `/people/${me.handle}?portfolio=new` : "/account?tab=profile&section=portfolio");
    }).catch(() => {
      if (live) setOwnHref("/account?tab=profile&section=portfolio");
    });
    return () => {
      live = false;
    };
  }, [user]);
  return (
    <section className={styles.invite}>
      <div>
        <p className={styles.inviteEyebrow}><UiText text={"MADE ON OONA"} /></p>
        <h2><UiText text={"Your credits are already a portfolio."} /></h2>
        <p className={styles.inviteText}>
          <UiText text={"Every work you upload, and every one you're credited on, adds itself to your OONA portfolio with the people you made it with. Send it as one link."} />
        </p>
      </div>
      <div className={styles.inviteActions}>
        <Link className={styles.invitePrimary} href={user ? ownHref ?? "/account?tab=profile&section=portfolio" : "/signup"}>
          {user ? <UiText text={"Make your portfolio link"} /> : <UiText text={"Make your portfolio, free"} />}
        </Link>
        <Link href="/society"><UiText text={"Look around Society"} /></Link>
      </div>
    </section>
  );
}

/** While it loads: the same sky, the name and works as soft placeholders. */
export function PortfolioSkeleton() {
  const copy = useUiCopy();
  const { t } = useTranslations();
  return (
    <main className={profile.page} aria-busy="true">
      <span className="sr-only" role="status">{t("common.loading")}</span>
      <section className={profile.hero} data-society-hero="">
        <div className={profile.heroSky} aria-hidden="true">
          <Image src={PROFILE_SKY} alt="" fill priority unoptimized sizes="100vw" style={{ objectFit: "cover", objectPosition: PROFILE_SKY_POSITION }} />
        </div>
        <div className={profile.heroInner}>
          <div className={profile.backRow}>
            <i className={`${profile.skel} ${profile.skelLine}`} style={{ width: 180 }} aria-hidden="true" />
            <span>{copy("PORTFOLIO")}</span>
          </div>
          <div className={profile.heroGrid} aria-hidden="true">
            <div>
              <p className={profile.eyebrow}><UiText text={"A portfolio on OONA"} /></p>
              <div className={profile.skelName}><i className={profile.skel} /><i className={profile.skel} /></div>
              <div className={profile.skelBio}><i className={profile.skel} /><i className={profile.skel} style={{ width: "72%" }} /></div>
              <div className={profile.skelActions}><i className={profile.skel} /><i className={profile.skel} /><i className={profile.skel} /></div>
            </div>
            <div className={profile.constellation}>
              <svg className={profile.branches} viewBox="0 0 100 100"><circle className={profile.orbit} cx="50" cy="50" r="17" /></svg>
              <div className={profile.core}><span className={profile.coreStar} /></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/** A link that's gone (taken back, expired, or never was), and what OONA is. */
export function PortfolioMissing({ message }: { message: string }) {
  return (
    <main className={profile.page}>
      <div className={profile.missing} role="alert">
        <p>{message}</p>
        <Link href="/"><UiText text={"Go to OONA →"} /></Link>
      </div>
      <div className={profile.inner}>
        <PortfolioInvite />
      </div>
    </main>
  );
}
