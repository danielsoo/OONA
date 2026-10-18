"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import BusinessInviteComposerModal, { type PresetRecipient } from "@/components/messages/BusinessInviteComposerModal";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import SocietyLoginDialog from "@/components/society/SocietyLoginDialog";
import type { SocietyTabId } from "@/components/society/SocietyNetworkPanel";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import { primaryRole, type DirCredit, type DirPerson } from "@/lib/society-directory";
import { invalidateBusinessInvites } from "@/lib/societyInviteCache";
import DemoBadge from "@/components/society/DemoBadge";
import { watchHref } from "@/lib/demo-flags";
import SocietySky from "./SocietySky";
import { useSnapGlide } from "./useSnapGlide";
import { useSocietyDirectory } from "./useSocietyDirectory";
import styles from "./SocietyDiscover.module.css";

type Filter = "everyone" | "director" | "cast" | "crew" | "available";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "everyone", label: "Everyone" },
  { id: "director", label: "Directors" },
  { id: "cast", label: "Actors" },
  { id: "crew", label: "Crew" },
  { id: "available", label: "Open to work" },
];

/** People introduced one at a time at the top. */
const FEATURED_MAX = 6;
const ROTATE_MS = 9000;
/** Cards shown at first, and added by each "show more". */
const GRID_STEP = 18;
/** For someone with no photo and no credited work yet. */
const FALLBACK_PICTURE = "/images/home/xiio-portal-hero.png";

function stillOf(person: DirPerson): string | null {
  return stillCredit(person)?.work.stillUrl ?? null;
}

/** The first of their works that has a frame to show. */
function stillCredit(person: DirPerson): DirCredit | null {
  return person.credits.find((credit) => credit.work.stillUrl) ?? null;
}

/** Each work once, in the order they were credited. */
function creditedWorks(person: DirPerson): DirCredit[] {
  const seen = new Set<string>();
  return person.credits.filter((credit) => {
    if (seen.has(credit.work.key)) return false;
    seen.add(credit.work.key);
    return true;
  });
}

/** What they say about themselves, short enough to set as a quote. */
function quoteOf(person: DirPerson): string | null {
  if (person.headline) return person.headline;
  const sentence = person.bio?.split(/(?<=[.!?。！？])\s+/)[0]?.trim();
  return sentence && sentence.length <= 160 ? sentence : null;
}

/** "Lena Brandt" sets on two lines, as the home's headline does. */
function nameLines(name: string): string[] {
  const parts = name.trim().split(/\s+/);
  return parts.length === 2 ? parts : [name.trim()];
}

function matchesQuery(person: DirPerson, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [person.name, person.handle, person.headline, ...person.schools, ...person.credits.map((c) => c.work.title)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function matchesFilter(person: DirPerson, filter: Filter): boolean {
  if (filter === "everyone") return true;
  if (filter === "available") return person.available;
  return person.groups.includes(filter);
}

/**
 * A person's patch of sky on their card, the same every time: which part of
 * the small-star texture shows, and where in it their star sits, bigger for
 * someone with more works.
 */
function skyPatch(person: DirPerson): CSSProperties {
  let h = 0;
  for (const ch of person.uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const works = new Set(person.credits.map((c) => c.work.key)).size;
  return {
    backgroundPosition: `${h % 97}px ${(h >> 7) % 89}px, ${(h >> 3) % 131}px ${(h >> 11) % 113}px`,
    "--sx": `${((h >> 5) % 41) - 20}%`,
    "--sy": `${((h >> 13) % 31) - 15}%`,
    "--ss": `${7 + Math.min(works, 4) * 1.5}px`,
  } as CSSProperties;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function Picture({ src, sizes, className, priority }: { src: string; sizes: string; className?: string; priority?: boolean }) {
  return <Image src={src} alt="" fill sizes={sizes} priority={priority} unoptimized={/^https?:/.test(src)} className={className} />;
}

function ProfileLink({ person, className, children }: { person: DirPerson; className: string; children: ReactNode }) {
  return person.handle ? (
    <Link href={`/people/${person.handle}`} className={className}>{children}</Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

function Chevron({ left = false }: { left?: boolean }) {
  return (
    <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
      <path d={left ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/**
 * Society's Discover: the sky above the home's sea (SocietySky), then one
 * creator at a time in the large picture, one in focus with their own
 * words, and everyone else. It follows the cinematic home
 * (CinematicHomePage.module.css); the other sections (connections,
 * invitations, your works) are SocietyNetworkPanel.
 */
export default function SocietyDiscover({ onTabChange }: { onTabChange: (tab: SocietyTabId) => void }) {
  const copy = useUiCopy();
  const { t } = useTranslations();
  const { user, loading: authLoading } = useAuth();
  const { directory, sky, failed, demo, demoKnown } = useSocietyDirectory();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Filter>("everyone");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(GRID_STEP);
  const [inviteRecipient, setInviteRecipient] = useState<PresetRecipient | null>(null);
  const [loginReturnTo, setLoginReturnTo] = useState<string | null>(null);

  // The page opens on a full-bleed picture: the site header lies over it
  // (CinematicAppHeader.module.css) while this view is on screen. The page's
  // own data-society-hero does it with :has(); this is for browsers without.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.societyHero = "";
    return () => {
      delete root.dataset.societyHero;
    };
  }, []);

  // One scroll glides from screen to screen: the sea, the sky, then each
  // section below marked data-glide-stop (not with reduced motion).
  const [still, setStill] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const stops = useCallback(() => {
    const at = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
    const out: number[] = [];
    const sky = document.querySelector<HTMLElement>("[data-glide-sky]");
    if (sky) out.push(at(sky), at(sky) + Math.max(0, sky.offsetHeight - window.innerHeight));
    document.querySelectorAll<HTMLElement>("[data-glide-stop]").forEach((el) => out.push(at(el)));
    return out;
  }, []);
  useSnapGlide(stops, !still);

  // Arriving at a section, what's in it comes up into view (set up once the
  // page runs, so without scripts nothing waits to appear).
  const [revealing, setRevealing] = useState(false);
  useEffect(() => {
    setRevealing(true);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) (entry.target as HTMLElement).dataset.shown = "";
      },
      { threshold: 0.25 }
    );
    document.querySelectorAll("[data-glide-stop]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [directory]);

  const roleOf = useCallback(
    (person: DirPerson) => {
      const role = primaryRole(person);
      return role === "crew" ? copy("Creative crew") : t(`watch.creditRole.${role}`);
    },
    [copy, t]
  );
  const metaOf = useCallback((person: DirPerson) => [roleOf(person), person.schools[0]].filter(Boolean).join(" · "), [roleOf]);

  const people = useMemo(() => directory?.people ?? [], [directory]);

  const featured = useMemo(() => {
    const pictured = people.filter((person) => stillOf(person) || person.avatarUrl);
    const pool = pictured.length > 0 ? pictured : people;
    // Credited people first; the directory's per-visit order otherwise.
    return [...pool].sort((a, b) => Number(b.credits.length > 0) - Number(a.credits.length > 0)).slice(0, FEATURED_MAX);
  }, [people]);

  const focus = useMemo(() => {
    const others = people.filter((person) => !featured.includes(person));
    const pool = others.length > 0 ? others : people.slice(1);
    return pool.find((person) => quoteOf(person) && person.credits.length > 0) ?? pool.find((person) => person.credits.length > 0) ?? null;
  }, [featured, people]);

  const matches = useMemo(
    () => people.filter((person) => matchesFilter(person, filter) && matchesQuery(person, query)),
    [filter, people, query]
  );

  const hero = featured.length > 0 ? featured[index % featured.length]! : null;

  useEffect(() => {
    if (featured.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % featured.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [featured.length, paused, index]);

  const step = (by: number) => setIndex((current) => (current + by + featured.length) % featured.length);

  const openSection = (tab: SocietyTabId) => {
    if (tab === "discover" || authLoading) return;
    if (!user) setLoginReturnTo(`/society?tab=${tab}`);
    else onTabChange(tab);
  };

  const askToWork = (person: DirPerson) => {
    if (authLoading) return;
    if (!user) {
      setLoginReturnTo("/society");
      return;
    }
    setInviteRecipient({ uid: person.uid, handle: person.handle ?? "", displayName: person.name, avatarUrl: person.avatarUrl });
  };

  const heroBody = (person: DirPerson) => {
    const works = creditedWorks(person);
    const about =
      person.bio ??
      person.headline ??
      (works.length > 1
        ? copy("Credited on {first} and {second}.", { first: works[0]!.work.title, second: works[1]!.work.title })
        : works.length === 1
          ? copy("Credited on {title}.", { title: works[0]!.work.title })
          : "");
    return [about, person.available ? copy("Open to a new project.") : ""].filter(Boolean).join(" ");
  };

  const heroMeta = (person: DirPerson) => {
    const count = creditedWorks(person).length;
    return [
      roleOf(person),
      person.schools[0],
      count > 0 ? copy(count === 1 ? "1 work on OONA" : "{count} works on OONA", { count }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className={`${styles.page} ${revealing ? styles.revealing : ""}`} data-society-hero="">
      {/* Once it's known which this is: the demo's badge, or the way into it. */}
      {demoKnown ? <DemoBadge active={demo} /> : null}
      <SocietySky directory={sky} onOpenSection={openSection} />

      <section
        className={styles.hero}
        data-glide-stop=""
        aria-label={copy("Creator in focus")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {hero ? (
          <div className={styles.heroCopy} key={hero.uid}>
            <p className={styles.eyebrow}><UiText text="Creator in focus" /></p>
            <h2 className={styles.name}>
              {nameLines(hero.name).map((line) => <span key={line}>{line}</span>)}
            </h2>
            <p className={styles.meta}>{heroMeta(hero)}</p>
            {heroBody(hero) ? <p className={styles.body}>{heroBody(hero)}</p> : null}
            <div className={styles.actions}>
              {hero.handle ? (
                <Link href={`/people/${hero.handle}`} className={styles.primary}>
                  <UiText text="View profile" /> <Chevron />
                </Link>
              ) : null}
              <button type="button" className={styles.secondary} disabled={authLoading || demo} onClick={() => askToWork(hero)}>
                <UiText text="Ask to work together" />
              </button>
            </div>
            {featured.length > 1 ? (
              <div className={styles.dots}>
                {featured.map((person, i) => (
                  <button
                    key={person.uid}
                    type="button"
                    aria-label={copy("Show creator {number}", { number: i + 1 })}
                    aria-current={i === index % featured.length ? "true" : undefined}
                    onClick={() => setIndex(i)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>OONA Society</p>
            <p className={styles.status} role="status">
              {directory === null ? <UiText text="Finding creators…" /> : <UiText text="No creators to show yet." />}
            </p>
          </div>
        )}

        {/* Their work, whole, on a glowing screen in the night. */}
        <figure className={styles.screen} key={`screen:${hero?.uid ?? "none"}`}>
          <div className={styles.screenStage}>
            <div className={styles.screenFrame}>
              <Picture
                src={hero ? stillOf(hero) ?? hero.avatarUrl ?? FALLBACK_PICTURE : FALLBACK_PICTURE}
                sizes="(max-width: 1040px) 92vw, 54vw"
                className={styles.screenImage}
              />
            </div>
            <span className={styles.screenGlow} aria-hidden="true" />
          </div>
          {hero && stillCredit(hero) ? (
            <figcaption>
              <Link href={watchHref(stillCredit(hero)!.work)}>{stillCredit(hero)!.work.title}</Link>
              <span>{stillCredit(hero)!.character ?? t(`watch.creditRole.${stillCredit(hero)!.role}`)}</span>
            </figcaption>
          ) : null}
        </figure>

        {featured.length > 1 ? (
          <div className={styles.pager}>
            <span>{pad((index % featured.length) + 1)} / {pad(featured.length)}</span>
            <button type="button" aria-label={copy("Previous creator")} onClick={() => step(-1)}><Chevron left /></button>
            <i aria-hidden="true" />
            <button type="button" aria-label={copy("Next creator")} onClick={() => step(1)}><Chevron /></button>
          </div>
        ) : null}
      </section>

      {people.length > 0 ? (
        <div className={styles.content}>
          {focus ? (
            <section aria-labelledby="society-focus" className={styles.stop} data-glide-stop="">
              <h2 id="society-focus" className={styles.sectionTitle}><UiText text="In focus" /></h2>
              <article className={styles.focus}>
                <div className={styles.focusStar} aria-hidden="true">
                  {focus.avatarUrl ? (
                    <span className={styles.focusAvatar}><Picture src={focus.avatarUrl} sizes="240px" /></span>
                  ) : (
                    <i className={styles.bigStar} />
                  )}
                </div>
                <div className={styles.focusText}>
                  <p className={styles.eyebrow}>{metaOf(focus)}</p>
                  {quoteOf(focus) ? (
                    <blockquote className={styles.quote}>“{quoteOf(focus)}”</blockquote>
                  ) : (
                    <p className={`${styles.quote} ${styles.plainQuote}`}>{focus.name}</p>
                  )}
                  {quoteOf(focus) ? <p className={styles.who}><strong>{focus.name}</strong> · {metaOf(focus)}</p> : null}
                  <p className={styles.seenLabel}><UiText text="Seen in" /></p>
                  <ul className={styles.works}>
                    {creditedWorks(focus).slice(0, 3).map((credit) => (
                      <li key={credit.work.key}>
                        <Link href={watchHref(credit.work)} className={styles.workCard}>
                          {credit.work.stillUrl ? <Picture src={credit.work.stillUrl} sizes="200px" /> : null}
                          <span className={styles.cardText}>
                            <strong>{credit.work.title}</strong>
                            <small>{credit.character ?? t(`watch.creditRole.${credit.role}`)}</small>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {focus.handle ? (
                    <Link href={`/people/${focus.handle}`} className={styles.primary}>
                      <UiText text="Read their story" /> <Chevron />
                    </Link>
                  ) : null}
                </div>
              </article>
            </section>
          ) : null}

          <section aria-labelledby="society-everyone" className={styles.stop} data-glide-stop="">
            <div className={styles.gridHead}>
              <h2 id="society-everyone" className={styles.sectionTitle}><UiText text="Meet the society" /></h2>
              <div className={styles.tools}>
                <label className={styles.search}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setVisible(GRID_STEP);
                    }}
                    placeholder={copy("Search people")}
                    aria-label={copy("Search people")}
                  />
                </label>
                <div className={styles.filters} role="group" aria-label={copy("Filter people")}>
                  {FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={filter === item.id}
                      onClick={() => {
                        setFilter(item.id);
                        setVisible(GRID_STEP);
                      }}
                    >
                      {copy(item.label)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {matches.length === 0 ? (
              <p className={styles.status}><UiText text="No one matches yet." /></p>
            ) : (
              <ul className={styles.grid}>
                {matches.slice(0, visible).map((person) => (
                  <li key={person.uid}>
                    <ProfileLink person={person} className={`${styles.personCard} ${person.available ? styles.personOpen : ""}`}>
                      {/* Their picture, or a frame of their work; their star when there's neither. */}
                      {person.avatarUrl || stillOf(person) ? (
                        <span className={styles.personThumb} aria-hidden="true">
                          <Picture src={person.avatarUrl ?? stillOf(person)!} sizes="(max-width: 600px) 50vw, (max-width: 1040px) 33vw, 18vw" />
                        </span>
                      ) : (
                        <span className={styles.personSky} style={skyPatch(person)} aria-hidden="true">
                          <i className={styles.personStar} />
                        </span>
                      )}
                      <span className={styles.personText}>
                        <strong>{person.name}</strong>
                        <small>{metaOf(person)}</small>
                        {creditedWorks(person).length > 0 ? (
                          <span className={styles.personWorks}>{creditedWorks(person).slice(0, 2).map((c) => c.work.title).join(", ")}</span>
                        ) : null}
                        {person.available ? <em><UiText text="Open to work" /></em> : null}
                      </span>
                    </ProfileLink>
                  </li>
                ))}
              </ul>
            )}
            {matches.length > visible ? (
              <div className={styles.more}>
                <button type="button" className={styles.secondary} onClick={() => setVisible((current) => current + GRID_STEP)}>
                  <UiText text="Show more" />
                </button>
              </div>
            ) : null}
          </section>

          <footer className={styles.footer}>
            <p><UiText text="A society" /><br /><UiText text="of student creators." /></p>
            <span className={styles.footerLine} aria-hidden="true" />
            <p className={styles.motto}><UiText text="Different schools." /><br /><UiText text="Same creative tide." /></p>
          </footer>
        </div>
      ) : failed ? (
        <p className={`${styles.status} ${styles.padded}`}><UiText text="We couldn’t load the creator directory. Please try again." /></p>
      ) : null}

      <SocietyLoginDialog open={!authLoading && !user && loginReturnTo !== null} returnTo={loginReturnTo ?? "/society"} onClose={() => setLoginReturnTo(null)} />
      {user && inviteRecipient ? (
        <BusinessInviteComposerModal
          presetRecipient={inviteRecipient}
          onClose={() => setInviteRecipient(null)}
          onSent={() => {
            setInviteRecipient(null);
            // Show the new invite in Sent, fetched fresh.
            invalidateBusinessInvites(user.uid, "sent");
            onTabChange("sent");
          }}
        />
      ) : null}
    </div>
  );
}
