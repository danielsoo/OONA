"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import StreamHlsVideo from "@/components/shorts/StreamHlsVideo";
import { useTranslations } from "@/context/LocaleContext";
import { useRecordEngagementView } from "@/hooks/useRecordEngagementView";
import { UPLOAD_HREF } from "@/lib/appNav";
import { buildRollLines, rollLength, type RollLine } from "@/lib/credits-roll";
import { watchHref } from "@/lib/works/catalog-ui";
import type { CreditsRollPerson, CreditsRollWork } from "@/types/creditsRoll";
import styles from "./CreditsHome.module.css";

const LINE_H = 56;
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
      // Same rule as the watch page: a character named like the person adds nothing.
      const character = person.characterName?.trim();
      return character && character !== person.displayName.trim() ? `${role} · ${character}` : role;
    },
    [t]
  );
}

/** Works with confirmed credits (GET /api/feed/credits-roll); `works` is null while loading. */
export function useCreditsRollFeed() {
  const [works, setWorks] = useState<CreditsRollWork[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

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

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { works, failed, retry };
}

/** "Stay for the credits" and the one-line note. */
export function CreditsIntro() {
  return (
    <div className={styles.intro}>
      <h1 className={styles.eyebrow}>
        <UiText text="Stay for the credits" />
      </h1>
      <p className={styles.introNote}>
        <UiText text="Every name here is a confirmed credit on a real OONA work." />
      </p>
    </div>
  );
}

/**
 * Credits home: an end-credit roll of confirmed credits from real works, one
 * name at a time, with that person's work on a large screen beside it. Below
 * it, a blind screening: frames with no title or names until the film ends.
 */
export default function CreditsHome() {
  const { works, failed, retry } = useCreditsRollFeed();
  const [mode, setMode] = useState<Mode>({ kind: "roll" });

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
          <button type="button" className={styles.solidButton} onClick={retry}>
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
      <CreditsIntro />
      <CreditsRoll works={works} />
      <BlindRow works={works} onOpen={openBlind} />
    </main>
  );
}

type RollData = {
  byId: Map<string, CreditsRollWork>;
  lines: Line[];
};

function useRollData(works: CreditsRollWork[]): RollData {
  return useMemo(
    () => ({
      byId: new Map(works.map((w) => [w.workId, w])),
      lines: buildRollLines(works, rollLength(works)),
    }),
    [works]
  );
}

/** Hover or keyboard focus inside the roll holds it still; leaving releases the pin. */
function useRollHold(setPinned: (index: number | null) => void) {
  const holdRef = useRef(false);
  const handlers = {
    onMouseEnter: () => {
      holdRef.current = true;
    },
    onMouseLeave: () => {
      holdRef.current = false;
      setPinned(null);
    },
    onFocus: () => {
      holdRef.current = true;
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        holdRef.current = false;
        setPinned(null);
      }
    },
  };
  return { holdRef, handlers };
}

/** One name holds the center, then the next steps in. */
function useSteppedRoll(
  lines: Line[],
  enabled: boolean,
  holdRef: React.RefObject<boolean>,
  heldRef: React.RefObject<boolean>
) {
  const [index, setIndex] = useState(0);
  const [jump, setJump] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled || lines.length === 0) return;
    const timer = window.setInterval(() => {
      if (holdRef.current || heldRef.current || pausedRef.current) return;
      setIndex((i) => {
        // Back to the top without animating through every line.
        const next = i + 1 >= lines.length ? 0 : i + 1;
        setJump(next === 0);
        return next;
      });
    }, SECONDS_PER_LINE * 1000);
    return () => window.clearInterval(timer);
  }, [lines, enabled, holdRef, heldRef]);

  return { index, jump, paused, setPaused };
}

function nameHref(line: Line, byId: Map<string, CreditsRollWork>): string {
  return line.credit.profileHref ?? watchHref(byId.get(line.workId)!.ownerUid, line.workId);
}

function PauseButton({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  const copy = useUiCopy();
  return (
    <button type="button" className={styles.ghostButton} onClick={onToggle}>
      {paused ? copy("Play the credits") : copy("Pause the credits")}
    </button>
  );
}

/**
 * The roll on the left, one large screen on the right showing the work of the
 * name at the center line. One name holds the center, then the next steps in.
 */
/** `held` keeps the first name at the center (e.g. while the home's intro plays). */
export function CreditsRoll({ works, held = false }: { works: CreditsRollWork[]; held?: boolean }) {
  const { byId, lines } = useRollData(works);
  const copy = useUiCopy();
  const roleLabel = useRoleLabel();
  const reducedMotion = usePrefersReducedMotion();
  const [pinned, setPinned] = useState<number | null>(null);
  const { holdRef, handlers } = useRollHold(setPinned);
  const heldRef = useRef(held);
  heldRef.current = held;
  const stepped = useSteppedRoll(lines, !reducedMotion, holdRef, heldRef);

  const current = pinned ?? (reducedMotion ? 0 : stepped.index);
  const line = lines[current % lines.length];
  if (!line) return null;
  const work = byId.get(line.workId)!;
  const renderLine = (l: Line, i: number, distance?: number) => {
    const on = i === current;
    // Names dim with their distance from the center line.
    const opacity = distance === undefined ? undefined : distance === 0 ? 1 : distance === 1 ? 0.6 : distance <= 3 ? 0.34 : 0.2;
    return (
      <div className={styles.sideLine} style={opacity === undefined ? undefined : { opacity }}>
        <span className={styles.sideRole}>{roleLabel(l.credit)}</span>
        <span className={styles.sideNameCell}>
          <Link
            href={nameHref(l, byId)}
            prefetch={false}
            className={`${styles.sideName} ${on ? styles.sideNameOn : ""}`}
            onMouseEnter={() => setPinned(i)}
            onFocus={() => setPinned(i)}
          >
            {l.credit.displayName}
          </Link>
          <span className={`${styles.sideWork} ${styles.serif}`}>{byId.get(l.workId)!.title}</span>
        </span>
      </div>
    );
  };

  let rollBody: ReactNode;
  if (reducedMotion) {
    rollBody = lines.map((l, i) => <Fragment key={i}>{renderLine(l, i)}</Fragment>);
  } else {
    rollBody = (
      <>
        <div className={styles.sideCenter} aria-hidden="true" />
        <div
          className={styles.track}
          style={{
            transform: `translateY(calc(50% - ${LINE_H / 2}px - ${stepped.index * LINE_H}px))`,
            transition: stepped.jump ? "none" : "transform 900ms cubic-bezier(0.3, 0, 0.2, 1)",
            height: "100%",
          }}
        >
          {lines.map((l, i) => (
            <Fragment key={i}>{renderLine(l, i, Math.abs(i - current))}</Fragment>
          ))}
        </div>
      </>
    );
  }

  return (
    <section className={styles.side} aria-label={copy("Credits roll")}>
      <div className={styles.sideRollColumn}>
        <div className={`${styles.roll} ${styles.sideRoll}`} {...handlers}>
          {rollBody}
        </div>
        <div className={styles.sideFoot}>
          <span>
            <UiText text="One name holds the center, then the next steps in. Every work gets a turn. Hover to pause." />
          </span>
          {reducedMotion ? null : (
            <PauseButton paused={stepped.paused} onToggle={() => stepped.setPaused((p) => !p)} />
          )}
        </div>
      </div>

      <div className={styles.sideScreenWrap}>
        <div className={styles.sideScreen}>
          <MediaLayers work={work} playVideo={!reducedMotion} />
        </div>
        <div className={styles.sideCard}>
          <span className={styles.captionKicker}>{roleLabel(line.credit)}</span>
          {line.credit.profileHref ? (
            <Link href={line.credit.profileHref} className={`${styles.sideCardName} ${styles.serif}`}>
              {line.credit.displayName}
            </Link>
          ) : (
            <span className={`${styles.sideCardName} ${styles.serif}`}>{line.credit.displayName}</span>
          )}
          <span className={`${styles.sideCardWork} ${styles.serif}`}>{work.title}</span>
          <Link href={watchHref(work.ownerUid, work.workId)} className={styles.solidButton}>
            <UiText text="Watch this film" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The work's frame with its promo clip on top; a new work fades in over the last one. */
function MediaLayers({ work, playVideo }: { work: CreditsRollWork; playVideo: boolean }) {
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
    <>
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
    </>
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
