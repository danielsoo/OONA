"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import StreamHlsVideo from "@/components/shorts/StreamHlsVideo";
import { useTranslations } from "@/context/LocaleContext";
import { useRecordEngagementView } from "@/hooks/useRecordEngagementView";
import { UPLOAD_HREF } from "@/lib/appNav";
import { buildRollLines, pickSideWorks, rollLength, type RollLine } from "@/lib/credits-roll";
import { watchHref } from "@/lib/works/catalog-ui";
import type { CreditsRollPerson, CreditsRollWork } from "@/types/creditsRoll";
import styles from "./CreditsHome.module.css";

const LINE_H = 72;
const SECONDS_PER_LINE = 2.2;
const BLIND_FRAMES = 8;

type Line = RollLine<CreditsRollPerson>;
type Mode = { kind: "roll" } | { kind: "player"; workId: string; revealed: boolean };

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useRoleLabel() {
  const { t } = useTranslations();
  return useCallback(
    (person: CreditsRollPerson) => {
      const role = t(`watch.creditRole.${person.role}`);
      return person.characterName ? `${role} · ${person.characterName}` : role;
    },
    [t]
  );
}

/**
 * Credits home: an end-credit roll of confirmed credits from real works, with
 * the credited work on the left and another work by the same person (else the
 * next work on the roll) on the right. Below it, a blind screening: frames
 * with no title or names until the film ends.
 */
export default function CreditsHome() {
  const [works, setWorks] = useState<CreditsRollWork[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<Mode>({ kind: "roll" });

  useEffect(() => {
    let cancelled = false;
    setWorks(null);
    setFailed(false);
    fetch("/api/feed/credits-roll")
      .then(async (res) => {
        if (!res.ok) throw new Error(`credits_roll_${res.status}`);
        return (await res.json()) as { works?: CreditsRollWork[] };
      })
      .then((data) => {
        if (!cancelled) setWorks(data.works ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setWorks([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const openBlind = useCallback((workId: string) => {
    setMode({ kind: "player", workId, revealed: false });
    window.scrollTo({ top: 0 });
  }, []);

  if (works === null) {
    return (
      <main className={styles.page}>
        <p className={styles.loading} role="status">
          <UiText text="Loading the credits…" />
        </p>
      </main>
    );
  }

  if (failed) {
    return (
      <main className={styles.page}>
        <div className={styles.empty}>
          <p className={styles.eyebrow}>
            <UiText text="Stay for the credits" />
          </p>
          <h1 className={`${styles.emptyTitle} ${styles.serif}`}>
            <UiText text="The credits couldn't load." />
          </h1>
          <button type="button" className={styles.solidButton} onClick={() => setAttempt((n) => n + 1)}>
            <UiText text="Try again" />
          </button>
        </div>
      </main>
    );
  }

  if (works.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.empty}>
          <p className={styles.eyebrow}>
            <UiText text="Stay for the credits" />
          </p>
          <h1 className={`${styles.emptyTitle} ${styles.serif}`}>
            <UiText text="The credits are empty for now." />
          </h1>
          <p className={styles.introNote}>
            <UiText text="Upload a film and confirm your crew to be the first names here." />
          </p>
          <Link href={UPLOAD_HREF} className={styles.solidButton}>
            <UiText text="Upload a film" />
          </Link>
        </div>
      </main>
    );
  }

  if (mode.kind === "player") {
    const index = Math.max(0, works.findIndex((w) => w.workId === mode.workId));
    const work = works[index]!;
    return (
      <main className={styles.page}>
        <BlindPlayer
          key={work.workId}
          work={work}
          revealed={mode.revealed}
          onReveal={() => setMode({ kind: "player", workId: work.workId, revealed: true })}
          onNext={() => openBlind(works[(index + 1) % works.length]!.workId)}
          onBack={() => setMode({ kind: "roll" })}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <CreditsRoll works={works} />
      <BlindRow works={works} onOpen={openBlind} />
    </main>
  );
}

function CreditsRoll({ works }: { works: CreditsRollWork[] }) {
  const copy = useUiCopy();
  const roleLabel = useRoleLabel();
  const reducedMotion = usePrefersReducedMotion();

  const byId = useMemo(() => new Map(works.map((w) => [w.workId, w])), [works]);
  const lines = useMemo<Line[]>(() => buildRollLines(works, rollLength(works)), [works]);
  const worksByPerson = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const w of works) {
      for (const c of w.credits) {
        const list = map.get(c.userId) ?? [];
        if (!list.includes(w.workId)) list.push(w.workId);
        map.set(c.userId, list);
      }
    }
    return map;
  }, [works]);

  const [centerIndex, setCenterIndex] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const rollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prevCopyRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<number | null>(null);
  const holdRef = useRef(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // The roll moves outside React: one transform per frame, a state update only
  // when the line at the center changes.
  useEffect(() => {
    if (reducedMotion || lines.length === 0) return;
    const cycle = lines.length * LINE_H;
    let raf = 0;
    let last: number | null = null;
    let lastIndex = -1;
    const step = (now: number) => {
      const roll = rollRef.current;
      const track = trackRef.current;
      if (roll && track) {
        const center = roll.clientHeight / 2;
        // Start with the first name just inside the bottom fade, so it rises
        // into an empty frame but reaches the center within a few seconds.
        if (offsetRef.current === null) offsetRef.current = -center * 0.55;
        if (last !== null && !holdRef.current && !pausedRef.current) {
          offsetRef.current += (Math.min(100, now - last) / 1000) * (LINE_H / SECONDS_PER_LINE);
        }
        if (offsetRef.current >= cycle) offsetRef.current -= cycle;
        // The copy above the main one fills the top after the first pass; it
        // is revealed only once that region is off screen, so nothing pops in.
        if (prevCopyRef.current && offsetRef.current > roll.clientHeight) {
          prevCopyRef.current.classList.remove(styles.copyHidden);
        }
        track.style.transform = `translateY(${(center - LINE_H / 2 - offsetRef.current - cycle).toFixed(1)}px)`;
        const index = offsetRef.current < 0 ? 0 : Math.round(offsetRef.current / LINE_H) % lines.length;
        if (index !== lastIndex) {
          lastIndex = index;
          setCenterIndex(index);
        }
      }
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [lines, reducedMotion]);

  const current = pinned ?? centerIndex;
  const sides = pickSideWorks(lines, current, (uid) => worksByPerson.get(uid) ?? []);
  const line = lines[current % lines.length];
  if (!sides || !line) return null;

  const leftWork = byId.get(sides.left)!;
  const rightWork = byId.get(sides.right)!;
  const rightLine = sides.rightIsSamePerson
    ? null
    : lines.slice(current + 1).concat(lines.slice(0, current + 1)).find((l) => l.workId === sides.right);
  const personName = line.credit.displayName;
  const rightCredit = sides.rightIsSamePerson
    ? rightWork.credits.find((c) => c.userId === line.credit.userId)
    : rightLine?.credit;

  const copies = reducedMotion ? [0] : [0, 1, 2];

  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          <UiText text="Stay for the credits" />
        </p>
        <p className={styles.introNote}>
          <UiText text="Every name here is a confirmed credit on a real OONA work." />
        </p>
      </div>
      <section className={styles.stage} aria-label={copy("Credits roll")}>
        <Screen
          work={leftWork}
          kicker={copy("Now crediting")}
          meta={`${personName} · ${roleLabel(line.credit)}`}
          playVideo={!reducedMotion}
        />

        <div className={styles.rollColumn}>
          <div
            ref={rollRef}
            className={styles.roll}
            onMouseEnter={() => {
              holdRef.current = true;
            }}
            onMouseLeave={() => {
              holdRef.current = false;
              setPinned(null);
            }}
            onFocus={() => {
              holdRef.current = true;
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                holdRef.current = false;
                setPinned(null);
              }
            }}
          >
            {reducedMotion ? null : <div className={styles.rollCenter} aria-hidden="true" />}
            <div ref={trackRef} className={styles.track}>
              {copies.map((copyIndex) => (
                <div
                  key={copyIndex}
                  ref={copyIndex === 0 && !reducedMotion ? prevCopyRef : undefined}
                  className={copyIndex === 0 && !reducedMotion ? styles.copyHidden : undefined}
                  // Only the middle copy is read out; the others are visual repeats.
                  aria-hidden={copyIndex === 1 || reducedMotion ? undefined : true}
                >
                  {lines.map((l, i) => {
                    const href = l.credit.profileHref ?? watchHref(byId.get(l.workId)!.ownerUid, l.workId);
                    const repeat = copyIndex !== 1 && !reducedMotion;
                    return (
                      <div key={`${copyIndex}-${i}`} className={styles.line}>
                        <span className={styles.role}>{roleLabel(l.credit)}</span>
                        <Link
                          href={href}
                          prefetch={false}
                          tabIndex={repeat ? -1 : undefined}
                          className={`${styles.name} ${styles.serif} ${i === current ? styles.nameOn : ""}`}
                          onMouseEnter={() => setPinned(i)}
                          onFocus={() => setPinned(i)}
                        >
                          {l.credit.displayName}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.rollFoot}>
            <span>
              <UiText text="Hover to pause. Click a name to see their work." />
            </span>
            {reducedMotion ? null : (
              <button type="button" className={styles.ghostButton} onClick={() => setPaused((p) => !p)}>
                {paused ? copy("Play the credits") : copy("Pause the credits")}
              </button>
            )}
          </div>
        </div>

        <div className={styles.stageRight}>
          <Screen
            work={rightWork}
            kicker={sides.rightIsSamePerson ? copy("Also by {name}", { name: personName }) : copy("Up next")}
            meta={rightCredit ? `${rightCredit.displayName} · ${roleLabel(rightCredit)}` : ""}
            playVideo={!reducedMotion}
          />
        </div>
      </section>
    </>
  );
}

/** One side screen. A new work fades in over the last one. */
function Screen({
  work,
  kicker,
  meta,
  playVideo,
}: {
  work: CreditsRollWork;
  kicker: string;
  meta: string;
  playVideo: boolean;
}) {
  const copy = useUiCopy();
  const [layers, setLayers] = useState<CreditsRollWork[]>([work]);

  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1]?.workId === work.workId) return prev;
      return [...prev.filter((w) => w.workId !== work.workId).slice(-1), work];
    });
    // Drop the layer underneath once the fade has finished.
    const timer = window.setTimeout(() => setLayers((prev) => prev.slice(-1)), 1500);
    return () => window.clearTimeout(timer);
  }, [work]);

  return (
    <Link
      href={watchHref(work.ownerUid, work.workId)}
      prefetch={false}
      className={styles.screen}
      aria-label={copy("Watch {title}", { title: work.title })}
    >
      {layers.map((w, i) => {
        const top = i === layers.length - 1;
        return (
          <span key={w.workId} className={`${styles.layer} ${top && layers.length > 1 ? styles.layerEnter : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Stream thumbnails are already sized */}
            <img src={w.stillUrl} alt="" className={styles.media} />
            {top && playVideo && w.previewUrl ? (
              <StreamHlsVideo
                key={w.previewUrl}
                src={w.previewUrl}
                className={`${styles.media} ${styles.video}`}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
              />
            ) : null}
          </span>
        );
      })}
      <span className={styles.caption}>
        <span className={styles.captionKicker}>{kicker}</span>
        <span className={`${styles.captionTitle} ${styles.serif}`}>{work.title}</span>
        {meta ? <span className={styles.captionMeta}>{meta}</span> : null}
      </span>
    </Link>
  );
}

function BlindRow({ works, onOpen }: { works: CreditsRollWork[]; onOpen: (workId: string) => void }) {
  const copy = useUiCopy();
  const people = useMemo(() => new Set(works.flatMap((w) => w.credits.map((c) => c.userId))).size, [works]);
  return (
    <section className={styles.blind} aria-label={copy("Blind screening")}>
      <div className={styles.blindHead}>
        <div>
          <p className={styles.eyebrow}>
            <UiText text="Blind screening" />
          </p>
          <h2 className={`${styles.blindTitle} ${styles.serif}`}>
            <UiText text="Pick a frame. Names come after." />
          </h2>
        </div>
        <span className={styles.count}>{copy("{works} works · {people} people credited", { works: works.length, people })}</span>
      </div>
      <div className={styles.frames}>
        {works.slice(0, BLIND_FRAMES).map((w, i) => (
          <button
            key={w.workId}
            type="button"
            className={styles.frame}
            aria-label={copy("Watch frame {n} blind", { n: i + 1 })}
            onClick={() => onOpen(w.workId)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Stream thumbnails are already sized */}
            <img src={w.stillUrl} alt="" className={styles.media} />
          </button>
        ))}
      </div>
    </section>
  );
}

/** The work with no title, names or counts until it ends or the viewer skips. */
function BlindPlayer({
  work,
  revealed,
  onReveal,
  onNext,
  onBack,
}: {
  work: CreditsRollWork;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const copy = useUiCopy();
  const roleLabel = useRoleLabel();
  const [started, setStarted] = useState(false);
  const revealRef = useRef<HTMLElement>(null);
  useRecordEngagementView(work.ownerUid, work.workId, "full", started);

  // The reveal is the point: bring the title and the names into view.
  useEffect(() => {
    if (revealed) revealRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [revealed]);
  const sub = [work.category, work.schoolName].filter(Boolean).join(" · ");

  return (
    <div className={styles.player}>
      <div>
        <button type="button" className={styles.ghostButton} onClick={onBack}>
          <UiText text="Back to the credits" />
        </button>
      </div>
      <div>
        <p className={styles.eyebrow}>
          <UiText text="Blind screening" />
        </p>
        {revealed ? null : (
          <h1 className={`${styles.playerTitle} ${styles.serif}`}>
            <UiText text="No title. No names. No view counts. Just the work." />
          </h1>
        )}
      </div>
      <div className={styles.playerFrame}>
        <StreamHlsVideo
          src={work.playbackUrl}
          ariaLabel={revealed ? work.title : copy("Blind screening")}
          className="absolute inset-0 h-full w-full bg-black object-contain"
          playsInline
          muted={false}
          preload="auto"
          controls
          showQualitySelector
          onTimeUpdate={(event) => {
            if (!started && event.currentTarget.currentTime > 0) setStarted(true);
          }}
          onEnded={onReveal}
        />
      </div>
      {revealed ? (
        <section ref={revealRef} className={`${styles.rise} ${styles.reveal}`} aria-label={copy("The people who made it")}>
          <div>
            {sub ? <p className={styles.eyebrow}>{sub}</p> : null}
            <h1 className={`${styles.playerTitle} ${styles.serif}`}>
              <em>{work.title}</em>
            </h1>
          </div>
          <p className={styles.eyebrow}>
            <UiText text="The people who made it" />
          </p>
          <div className={styles.creditGrid}>
            {work.credits.map((c, i) =>
              c.profileHref ? (
                <Link
                  key={`${c.userId}-${c.role}-${i}`}
                  href={c.profileHref}
                  className={`${styles.creditCard} ${styles.rise}`}
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                >
                  <span className={styles.creditRole}>{roleLabel(c)}</span>
                  <span className={styles.creditName}>{c.displayName}</span>
                </Link>
              ) : (
                <div key={`${c.userId}-${c.role}-${i}`} className={`${styles.creditCard} ${styles.rise}`}>
                  <span className={styles.creditRole}>{roleLabel(c)}</span>
                  <span className={styles.creditName}>{c.displayName}</span>
                </div>
              )
            )}
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.solidButton} onClick={onNext}>
              <UiText text="Next blind screening" />
            </button>
            <Link href={watchHref(work.ownerUid, work.workId)} className={styles.ghostButton}>
              <UiText text="Open the full page" />
            </Link>
          </div>
        </section>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.ghostButton} onClick={onReveal}>
            <UiText text="Skip to the credits" />
          </button>
        </div>
      )}
    </div>
  );
}
