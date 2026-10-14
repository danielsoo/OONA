"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import StreamHlsVideo from "@/components/shorts/StreamHlsVideo";
import { useTranslations } from "@/context/LocaleContext";
import { useRecordEngagementView } from "@/hooks/useRecordEngagementView";
import { UPLOAD_HREF } from "@/lib/appNav";
import { buildRollLines, pickSideWorks, rollLength, type RollLine } from "@/lib/credits-roll";
import { watchHref } from "@/lib/works/catalog-ui";
import type { CreditsRollPerson, CreditsRollWork } from "@/types/creditsRoll";
import styles from "./CreditsHome.module.css";

const LINE_H_CENTERED = 72;
const LINE_H_SIDE = 56;
const SECONDS_PER_LINE = 2.2;
const BLIND_FRAMES = 8;

type Line = RollLine<CreditsRollPerson>;
type Mode = { kind: "roll" } | { kind: "player"; workId: string; revealed: boolean };

/** The three demos from the design canvas, kept side by side for comparison. */
export type Layout = "stepped" | "continuous" | "centered";
const LAYOUTS: { id: Layout; param: string; label: string }[] = [
  { id: "stepped", param: "a", label: "A · Stepped" },
  { id: "continuous", param: "b", label: "B · Continuous" },
  { id: "centered", param: "c", label: "C · Centered" },
];
const DEFAULT_LAYOUT: Layout = "centered";

/** The chosen layout lives in the URL (?layout=a|b|c) so a link opens that version. */
export function useLayoutChoice(): [Layout, (layout: Layout) => void] {
  const [layout, setLayoutState] = useState<Layout>(DEFAULT_LAYOUT);
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("layout");
    const found = LAYOUTS.find((l) => l.param === param);
    if (found) setLayoutState(found.id);
  }, []);
  const setLayout = useCallback((next: Layout) => {
    setLayoutState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("layout", LAYOUTS.find((l) => l.id === next)!.param);
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return [layout, setLayout];
}

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

/** "Stay for the credits", the A · B · C switch and the one-line note. */
export function CreditsIntro({ layout, onLayout }: { layout: Layout; onLayout: (layout: Layout) => void }) {
  const copy = useUiCopy();
  return (
    <div className={styles.intro}>
      <h1 className={styles.eyebrow}>
        <UiText text="Stay for the credits" />
      </h1>
      <div className={styles.layoutSwitch} role="group" aria-label={copy("Credits layout")}>
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`${styles.layoutOption} ${layout === l.id ? styles.layoutOptionOn : ""}`}
            aria-pressed={layout === l.id}
            onClick={() => onLayout(l.id)}
          >
            {copy(l.label)}
          </button>
        ))}
      </div>
      <p className={styles.introNote}>
        <UiText text="Every name here is a confirmed credit on a real OONA work." />
      </p>
    </div>
  );
}

/**
 * Credits home: an end-credit roll of confirmed credits from real works, with
 * the credited work on the left and another work by the same person (else the
 * next work on the roll) on the right. Below it, a blind screening: frames
 * with no title or names until the film ends.
 */
export default function CreditsHome() {
  const { works, failed, retry } = useCreditsRollFeed();
  const [mode, setMode] = useState<Mode>({ kind: "roll" });
  const [layout, setLayout] = useLayoutChoice();

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
      <CreditsIntro layout={layout} onLayout={setLayout} />
      <CreditsRoll works={works} layout={layout} />
      <BlindRow works={works} onOpen={openBlind} />
    </main>
  );
}

type RollData = {
  byId: Map<string, CreditsRollWork>;
  lines: Line[];
  worksByPerson: Map<string, string[]>;
};

function useRollData(works: CreditsRollWork[]): RollData {
  return useMemo(() => {
    const worksByPerson = new Map<string, string[]>();
    for (const w of works) {
      for (const c of w.credits) {
        const list = worksByPerson.get(c.userId) ?? [];
        if (!list.includes(w.workId)) list.push(w.workId);
        worksByPerson.set(c.userId, list);
      }
    }
    return {
      byId: new Map(works.map((w) => [w.workId, w])),
      lines: buildRollLines(works, rollLength(works)),
      worksByPerson,
    };
  }, [works]);
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

/**
 * B and C: the roll moves outside React, one transform per frame, with a
 * state update only when the line at the center changes. The track holds
 * three copies of the lines so the loop never shows a seam.
 */
function useContinuousRoll(lines: Line[], lineH: number, enabled: boolean, holdRef: React.RefObject<boolean>) {
  const rollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prevCopyRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<number | null>(null);
  const [centerIndex, setCenterIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled || lines.length === 0) return;
    const cycle = lines.length * lineH;
    offsetRef.current = null;
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
          offsetRef.current += (Math.min(100, now - last) / 1000) * (lineH / SECONDS_PER_LINE);
        }
        if (offsetRef.current >= cycle) offsetRef.current -= cycle;
        // The copy above the main one fills the top after the first pass; it
        // is revealed only once that region is off screen, so nothing pops in.
        if (prevCopyRef.current && offsetRef.current > roll.clientHeight) {
          prevCopyRef.current.classList.remove(styles.copyHidden);
        }
        track.style.transform = `translateY(${(center - lineH / 2 - offsetRef.current - cycle).toFixed(1)}px)`;
        const index = offsetRef.current < 0 ? 0 : Math.round(offsetRef.current / lineH) % lines.length;
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
  }, [lines, lineH, enabled, holdRef]);

  return { rollRef, trackRef, prevCopyRef, centerIndex, paused, setPaused };
}

/** A: one name holds the center, then the next steps in. */
function useSteppedRoll(lines: Line[], enabled: boolean, holdRef: React.RefObject<boolean>) {
  const [index, setIndex] = useState(0);
  const [jump, setJump] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled || lines.length === 0) return;
    const timer = window.setInterval(() => {
      if (holdRef.current || pausedRef.current) return;
      setIndex((i) => {
        // Back to the top without animating through every line.
        const next = i + 1 >= lines.length ? 0 : i + 1;
        setJump(next === 0);
        return next;
      });
    }, SECONDS_PER_LINE * 1000);
    return () => window.clearInterval(timer);
  }, [lines, enabled, holdRef]);

  return { index, jump, paused, setPaused };
}

/** Three copies of the lines for a seamless loop; only the middle one is read out or focusable. */
function ContinuousTrack({
  lines,
  trackRef,
  prevCopyRef,
  renderLine,
}: {
  lines: Line[];
  trackRef: React.RefObject<HTMLDivElement | null>;
  prevCopyRef: React.RefObject<HTMLDivElement | null>;
  renderLine: (line: Line, index: number, repeat: boolean) => ReactNode;
}) {
  return (
    <div ref={trackRef} className={styles.track}>
      {[0, 1, 2].map((copyIndex) => (
        <div
          key={copyIndex}
          ref={copyIndex === 0 ? prevCopyRef : undefined}
          className={copyIndex === 0 ? styles.copyHidden : undefined}
          aria-hidden={copyIndex === 1 ? undefined : true}
        >
          {lines.map((l, i) => (
            <Fragment key={`${copyIndex}-${i}`}>{renderLine(l, i, copyIndex !== 1)}</Fragment>
          ))}
        </div>
      ))}
    </div>
  );
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

export function CreditsRoll({ works, layout }: { works: CreditsRollWork[]; layout: Layout }) {
  const data = useRollData(works);
  if (data.lines.length === 0) return null;
  // Keyed so switching layouts restarts the motion from the top.
  return layout === "centered" ? (
    <CenteredLayout key="centered" data={data} />
  ) : (
    <SideLayout key={layout} data={data} motion={layout} />
  );
}

/** C: the roll in the middle, the credited work on the left, another work on the right. */
function CenteredLayout({ data }: { data: RollData }) {
  const { byId, lines, worksByPerson } = data;
  const copy = useUiCopy();
  const roleLabel = useRoleLabel();
  const reducedMotion = usePrefersReducedMotion();
  const [pinned, setPinned] = useState<number | null>(null);
  const { holdRef, handlers } = useRollHold(setPinned);
  const roll = useContinuousRoll(lines, LINE_H_CENTERED, !reducedMotion, holdRef);

  const current = pinned ?? (reducedMotion ? 0 : roll.centerIndex);
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

  const renderLine = (l: Line, i: number, repeat: boolean) => (
    <div className={styles.line}>
      <span className={styles.role}>{roleLabel(l.credit)}</span>
      <Link
        href={nameHref(l, byId)}
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

  return (
    <section className={styles.stage} aria-label={copy("Credits roll")}>
      <Screen
        work={leftWork}
        kicker={copy("Now crediting")}
        meta={`${personName} · ${roleLabel(line.credit)}`}
        playVideo={!reducedMotion}
      />

      <div className={styles.rollColumn}>
        <div ref={roll.rollRef} className={styles.roll} {...handlers}>
          {reducedMotion ? (
            lines.map((l, i) => <Fragment key={i}>{renderLine(l, i, false)}</Fragment>)
          ) : (
            <>
              <div className={styles.rollCenter} aria-hidden="true" />
              <ContinuousTrack
                lines={lines}
                trackRef={roll.trackRef}
                prevCopyRef={roll.prevCopyRef}
                renderLine={renderLine}
              />
            </>
          )}
        </div>
        <div className={styles.rollFoot}>
          <span>
            <UiText text="Hover to pause. Click a name to see their work." />
          </span>
          {reducedMotion ? null : <PauseButton paused={roll.paused} onToggle={() => roll.setPaused((p) => !p)} />}
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
  );
}

/**
 * A and B: the roll on the left, one large screen on the right showing the
 * work of the name at the center line. A steps one name at a time; B rolls
 * without stopping, like the end of a film.
 */
function SideLayout({ data, motion }: { data: RollData; motion: "stepped" | "continuous" }) {
  const { byId, lines } = data;
  const copy = useUiCopy();
  const roleLabel = useRoleLabel();
  const reducedMotion = usePrefersReducedMotion();
  const [pinned, setPinned] = useState<number | null>(null);
  const { holdRef, handlers } = useRollHold(setPinned);
  const continuous = useContinuousRoll(lines, LINE_H_SIDE, motion === "continuous" && !reducedMotion, holdRef);
  const stepped = useSteppedRoll(lines, motion === "stepped" && !reducedMotion, holdRef);

  const auto = reducedMotion ? 0 : motion === "stepped" ? stepped.index : continuous.centerIndex;
  const current = pinned ?? auto;
  const line = lines[current % lines.length];
  if (!line) return null;
  const work = byId.get(line.workId)!;
  const paused = motion === "stepped" ? stepped.paused : continuous.paused;
  const togglePause = () => (motion === "stepped" ? stepped.setPaused((p) => !p) : continuous.setPaused((p) => !p));

  const renderLine = (l: Line, i: number, repeat: boolean, distance?: number) => {
    const on = i === current;
    // A dims the names by distance from the center; B leaves that to the fade mask.
    const opacity = distance === undefined ? undefined : distance === 0 ? 1 : distance === 1 ? 0.6 : distance <= 3 ? 0.34 : 0.2;
    return (
      <div className={styles.sideLine} style={opacity === undefined ? undefined : { opacity }}>
        <span className={styles.sideRole}>{roleLabel(l.credit)}</span>
        <span className={styles.sideNameCell}>
          <Link
            href={nameHref(l, byId)}
            prefetch={false}
            tabIndex={repeat ? -1 : undefined}
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
    rollBody = lines.map((l, i) => <Fragment key={i}>{renderLine(l, i, false)}</Fragment>);
  } else if (motion === "stepped") {
    rollBody = (
      <>
        <div className={styles.sideCenter} aria-hidden="true" />
        <div
          className={styles.track}
          style={{
            transform: `translateY(calc(50% - ${LINE_H_SIDE / 2}px - ${stepped.index * LINE_H_SIDE}px))`,
            transition: stepped.jump ? "none" : "transform 900ms cubic-bezier(0.3, 0, 0.2, 1)",
            height: "100%",
          }}
        >
          {lines.map((l, i) => (
            <Fragment key={i}>{renderLine(l, i, false, Math.abs(i - current))}</Fragment>
          ))}
        </div>
      </>
    );
  } else {
    rollBody = (
      <>
        <div className={styles.sideCenter} aria-hidden="true" />
        <ContinuousTrack
          lines={lines}
          trackRef={continuous.trackRef}
          prevCopyRef={continuous.prevCopyRef}
          renderLine={(l, i, repeat) => renderLine(l, i, repeat)}
        />
      </>
    );
  }

  return (
    <section className={styles.side} aria-label={copy("Credits roll")}>
      <div className={styles.sideRollColumn}>
        <div
          ref={motion === "continuous" ? continuous.rollRef : undefined}
          className={`${styles.roll} ${styles.sideRoll}`}
          {...handlers}
        >
          {rollBody}
        </div>
        <div className={styles.sideFoot}>
          <span>
            {motion === "stepped"
              ? copy("One name holds the center, then the next steps in. Every work gets a turn. Hover to pause.")
              : copy("Names roll up without stopping, like the end of a film. The scene follows whoever crosses the line. Hover to pause.")}
          </span>
          {reducedMotion ? null : <PauseButton paused={paused} onToggle={togglePause} />}
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

/** C's side screen: the whole screen links to the work. */
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
  return (
    <Link
      href={watchHref(work.ownerUid, work.workId)}
      prefetch={false}
      className={styles.screen}
      aria-label={copy("Watch {title}", { title: work.title })}
    >
      <MediaLayers work={work} playVideo={playVideo} />
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
