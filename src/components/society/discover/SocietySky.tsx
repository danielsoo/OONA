"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { SocietyTabId } from "@/components/society/SocietyNetworkPanel";
import { useTranslations } from "@/context/LocaleContext";
import { primaryRole, type DirPerson, type DirWork } from "@/lib/society-directory";
import { isDemoWork, watchHref } from "@/lib/demo-flags";
import { buildSky, layOutNeuron, neuronGroup, neuronTwigs, type NeuronGroup, type Seat, type SkyStar } from "@/lib/society-sky";
import styles from "./SocietySky.module.css";
import { SKY_IMAGE, SKY_SEATS } from "./skySeats";
import type { SkyDirectory } from "./useSocietyDirectory";

const SECTIONS: { id: SocietyTabId; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "connections", label: "My Connections" },
  { id: "requests", label: "Requests" },
  { id: "sent", label: "Sent" },
  { id: "works", label: "My Works" },
];

/**
 * Society is in space. It used to open on the home's night sea and tilt up
 * into a photographed sky, but that sky had thousands of stars of its own
 * and the constellations were lost among them — so the scene is deep space,
 * the dust of it, and no stars but the people's.
 */
const SCENE = "/images/society/society_space.webp";
/** The scene at 96×41, softened: shows at once while the picture loads. */
const SCENE_PREVIEW = "data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAADQBACdASpgACkAPu10rlOppqSio4qBMB2JaQDVBArhzUpITBb+IgJCgOko0C1L0AD+8PoS5MloeH8GsIaRIRPS3Mj4wzaLGxUitby5V2m9VbS/qcAAAA==";
/** Its own shape: below this the picture fills the height instead of the width. */
const SCENE_ASPECT = SKY_IMAGE.width / SKY_IMAGE.height;
/** Across the picture's crop: keeps the dust a little right of centre on any screen shape. */
const SCENE_X = 0.64;
/**
 * How long the lines take to draw themselves in, once. The sky is already
 * there when the page opens — this is the constellations joining up over it,
 * not a curtain the reader has to pull back.
 */
const DRAW_MS = 1500;

/**
 * What a phone's panel takes off the bottom of the sky: the card itself, the
 * 126px it is lifted by to clear the tab bar and the scroll-mode toggle, and
 * a little air. It holds one work's title and buttons and nothing else
 * (SocietySky.module.css hides the rest under 1040px), so its height is
 * steady enough to reserve for — and now that the sky is the first screen
 * rather than the end of a scroll, figures must not land behind it.
 */
const PANEL_BAND = 314;

/**
 * Where figures go: clear of the header and of the panel, which is on the
 * left on wide screens and below otherwise (SocietySky.module.css).
 */
function skyArea(w: number, h: number) {
  return w <= 1040
    ? { left: w * 0.06, right: w * 0.94, top: Math.max(96, h * 0.12), bottom: Math.max(h * 0.45, h - PANEL_BAND) }
    : { left: w * 0.34, right: w * 0.97, top: Math.max(110, h * 0.13), bottom: h * 0.88 };
}

/**
 * Where a seat lands on screen: the scene is drawn with object-fit: cover
 * over the whole screen, so the seats follow the same crop.
 */
function seatsOnScreen(w: number, h: number): Seat[] {
  const scale = Math.max(w / SKY_IMAGE.width, h / SKY_IMAGE.height);
  const rw = SKY_IMAGE.width * scale;
  const rh = SKY_IMAGE.height * scale;
  const ox = (w - rw) * SCENE_X;
  const oy = (h - rh) / 2;
  const area = skyArea(w, h);
  const seats: Seat[] = [];
  for (const [sx, sy, b] of SKY_SEATS) {
    const x = ox + sx * rw;
    const y = oy + sy * rh;
    if (x >= area.left && x <= area.right && y >= area.top && y <= area.bottom) seats.push({ x, y, b });
  }
  return seats;
}
const CREW_MAX = 8;
const GROUP_LABEL: Record<NeuronGroup, string> = { direction: "Directing & writing", cast: "Cast", crew: "Crew" };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** A branch from a to b that bows a little to one side, as a neuron's do. */
const curve = (a: { x: number; y: number }, b: { x: number; y: number }, bow: number) =>
  `M${a.x},${a.y} Q${(a.x + b.x) / 2 + (b.y - a.y) * bow},${(a.y + b.y) / 2 - (b.x - a.x) * bow} ${b.x},${b.y}`;
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Society's first screen: deep space, where everyone on OONA is a star and
 * each work they made together is a constellation joining them. It used to
 * open on an empty sky and hand the reader two screens of scrolling before
 * showing any of that; now the sky arrives whole and only the lines draw
 * themselves in, so what Society is is on the first screen.
 */
export default function SocietySky({
  directory,
  onOpenSection,
  openWork = null,
}: {
  directory: SkyDirectory | null;
  onOpenSection: (tab: SocietyTabId) => void;
  /** A work key from ?work=: go up to the sky and open it. */
  openWork?: string | null;
}) {
  const people = directory?.people ?? null;
  const me = directory?.me ?? null;
  const copy = useUiCopy();
  const { t } = useTranslations();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SVGGElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 1440, h: 900 });
  const [narrow, setNarrow] = useState(false);
  const [still, setStill] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // A work opened into a neuron of the people who made it (null: the sky).
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredWork, setHoveredWork] = useState<string | null>(null);
  // Leaving a star, its card stays a moment so the pointer can move onto it.
  const leaveTimer = useRef(0);
  const enter = useCallback((uid: string) => {
    window.clearTimeout(leaveTimer.current);
    setHovered(uid);
  }, []);
  const leave = useCallback((uid: string) => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHovered((h) => (h === uid ? null : h)), 220);
  }, []);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const byUid = useMemo(() => new Map((people ?? []).map((p) => [p.uid, p])), [people]);
  // People sit on the photograph's own stars; a phone's sky holds fewer figures, closer together.
  // Which works: yours first, then the newest, then others that change each visit.
  const sky = useMemo(
    () =>
      buildSky(people ?? [], seatsOnScreen(boxSize.w, boxSize.h), {
        maxConstellations: narrow ? 4 : undefined,
        spacing: narrow ? 48 : 64,
        me,
        newest: directory?.newest,
        rankOf: directory?.rankOf,
      }),
    [people, boxSize, narrow, me, directory]
  );
  const selected = sky.constellations.find((c) => c.work.key === selectedKey) ?? sky.constellations[0] ?? null;
  const starAt = useMemo(() => new Map(sky.stars.map((s) => [s.uid, s])), [sky]);
  // Everyone's credits by work, for any work a neuron can open on.
  const crews = useMemo(() => {
    const map = new Map<string, { work: DirWork; members: { uid: string; role: string; character: string | null }[] }>();
    for (const person of people ?? []) {
      for (const credit of person.credits) {
        const crew = map.get(credit.work.key) ?? { work: credit.work, members: [] };
        if (!crew.members.some((m) => m.uid === person.uid)) crew.members.push({ uid: person.uid, role: credit.role, character: credit.character });
        map.set(credit.work.key, crew);
      }
    }
    return map;
  }, [people]);
  const neuron = useMemo(() => {
    const crew = focusKey ? crews.get(focusKey) : null;
    if (!crew) return null;
    const area = skyArea(boxSize.w, boxSize.h);
    const center = { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 };
    const r = Math.min((area.right - area.left) / 2, (area.bottom - area.top) / 2) * 0.62;
    // A phone keeps its names on screen: narrower, taller.
    const rx = r * (narrow ? 0.86 : 1.3);
    const ry = r * (narrow ? 1.05 : 0.95);
    const layout = layOutNeuron(crew.members.map((m) => ({ uid: m.uid, group: neuronGroup(m.role) })), center, rx, ry);
    // Faint twigs to a few of their other works; none on a phone, where there's no room.
    const twigs = neuronTwigs(
      layout.nodes,
      (uid) => [...new Map((byUid.get(uid)?.credits ?? []).filter((c) => c.work.key !== crew.work.key).map((c) => [c.work.key, c.work])).values()],
      center,
      rx,
      ry,
      { max: narrow ? 0 : 8, bounds: { left: area.left - 10, right: area.right, top: area.top - 20, bottom: area.bottom + 30 } }
    );
    return { crew, center, layout, twigs, at: new Map(layout.nodes.map((n) => [n.uid, n])) };
  }, [focusKey, crews, boxSize, narrow, byUid]);

  const roleOf = useCallback(
    (person: DirPerson) => {
      const role = primaryRole(person);
      return role === "crew" ? copy("Creative crew") : t(`watch.creditRole.${role}`);
    },
    [copy, t]
  );

  // One scroll leaves the sky for the sections below (useSnapGlide, in
  // SocietyDiscover: this section is marked data-glide-sky).

  // An open neuron closes with Esc.
  useEffect(() => {
    if (!focusKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocusKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusKey]);

  // ?work= (a demo work's link, from a profile or below): back up to the sky
  // and open it. The sky shows its constellations on arrival now, so there is
  // nothing to wait for. Once picked up the key comes off the address, so the
  // same link opens it again later; the ref keeps a re-layout from reopening
  // what the reader has since closed.
  const tookWork = useRef<string | null>(null);
  useEffect(() => {
    const section = sectionRef.current;
    if (!openWork || tookWork.current === openWork || !section || !crews.has(openWork)) return;
    tookWork.current = openWork;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: window.scrollY > 40 && !still ? "smooth" : "auto" });
    if (sky.constellations.some((c) => c.work.key === openWork)) setSelectedKey(openWork);
    setFocusKey(openWork);
    const url = new URL(window.location.href);
    url.searchParams.delete("work");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, [openWork, crews, still, sky]);

  // Reduced motion: no tilt, just the sky.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Lay the constellations out for the box's shape.
  useEffect(() => {
    const paint = () => {
      const stage = stageRef.current;
      const box = boxRef.current;
      if (!stage) return;
      if (box) setBoxSize({ w: Math.max(1, box.clientWidth), h: Math.max(1, box.clientHeight) });
      setNarrow(stage.clientWidth < 600);
    };
    paint();
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // The lines draw themselves in, once, as the page opens. Everything else —
  // the stars, their names, the panel — is there from the first frame.
  // Re-running because the sky was laid out again (a resize) must not replay
  // it: the new paths are simply set to drawn.
  const drawnRef = useRef(false);
  useEffect(() => {
    const paint = (drawn: number) => {
      const paths = linesRef.current?.querySelectorAll<SVGPathElement>("path") ?? [];
      paths.forEach((path) => {
        const order = Number(path.dataset.order ?? 0);
        path.style.strokeDashoffset = String(1 - clamp(drawn * 1.6 - order * 0.07, 0, 1));
      });
    };
    if (still || drawnRef.current) {
      drawnRef.current = true;
      paint(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = clamp((now - start) / DRAW_MS, 0, 1);
      paint(smooth(t));
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else drawnRef.current = true;
    };
    paint(0);
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [still, sky]);

  // Opening a work: its constellation lights up and its people spread out.
  const open = (key: string) => {
    if (sky.constellations.some((c) => c.work.key === key)) setSelectedKey(key);
    setHovered(null);
    setHoveredWork(null);
    setFocusKey(key);
  };
  // The arrows move between the sky's works (and, with one open, open the next).
  const step = (by: number) => {
    const list = sky.constellations;
    const at = Math.max(0, list.findIndex((c) => c.work.key === (focusKey ?? selected?.work.key)));
    const next = list[(at + by + list.length) % list.length]!.work.key;
    if (focusKey) open(next);
    else setSelectedKey(next);
  };

  // A figure lights up when it's picked, or when its lines or name are pointed
  // at; pointing at a star lights only that star (and its name and card).
  const lit = (key: string) => key === selected?.work.key || key === hoveredWork;
  const hoveredFigure = hoveredWork ? sky.constellations.find((c) => c.work.key === hoveredWork) : null;
  const named = new Set([
    ...(selected?.members ?? []),
    ...(hoveredFigure?.members ?? []),
    ...(hovered ? [hovered] : []),
    ...(me && starAt.has(me) ? [me] : []),
  ]);
  // A name goes right of its star, or left when that would cover another
  // shown name or star, or run off the edge (widths are a rough guess).
  const leftNames = new Set<string>();
  const nameBoxes: { left: number; right: number; top: number; bottom: number }[] = [];
  const textWidth = (text: string, px: number) => [...text].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? px : px * 0.56), 0);
  for (const s of [...named].map((uid) => starAt.get(uid)).filter((s): s is SkyStar => !!s).sort((a, b) => a.x - b.x)) {
    const person = byUid.get(s.uid);
    if (!person) continue;
    const w = Math.max(textWidth(person.name, 12.5), textWidth(roleOf(person), 10.5)) + 6;
    const sides = [
      { left: s.x + 20, right: s.x + 20 + w, top: s.y - 18, bottom: s.y + 14 },
      { left: s.x - 20 - w, right: s.x - 20, top: s.y - 18, bottom: s.y + 14 },
    ];
    const cost = (b: (typeof sides)[number]) =>
      (b.left < 4 || b.right > boxSize.w - 4 ? 1e6 : 0) +
      nameBoxes.reduce((sum, o) => sum + Math.max(0, Math.min(b.right, o.right) - Math.max(b.left, o.left)) * Math.max(0, Math.min(b.bottom, o.bottom) - Math.max(b.top, o.top)), 0) +
      sky.stars.filter((o) => o !== s && o.x > b.left - 6 && o.x < b.right + 6 && o.y > b.top - 6 && o.y < b.bottom + 6).length * 200;
    const onLeft = cost(sides[1]!) < cost(sides[0]!);
    if (onLeft) leftNames.add(s.uid);
    nameBoxes.push(sides[onLeft ? 1 : 0]!);
  }
  const tip = hovered ? byUid.get(hovered) : null;
  const tipStar = hovered ? (neuron ? neuron.at.get(hovered) : starAt.get(hovered)) ?? null : null;
  // Everything they made, not just the figure they're in.
  const tipWorks = tip ? [...new Set(tip.credits.map((c) => c.work.title))].slice(0, 3) : [];
  const panelWork = neuron?.crew.work ?? selected?.work ?? null;
  const crew = neuron
    ? neuron.crew.members.flatMap((m) => {
        const person = byUid.get(m.uid);
        return person ? [{ person, role: m.character ?? t(`watch.creditRole.${m.role}`) }] : [];
      })
    : selected
      ? selected.members.map((uid) => {
          const person = byUid.get(uid)!;
          const credit = person.credits.find((c) => c.work.key === selected.work.key);
          return { person, role: credit ? credit.character ?? t(`watch.creditRole.${credit.role}`) : roleOf(person) };
        })
      : [];

  return (
    <section ref={sectionRef} data-glide-sky="" className={styles.sky} aria-label={copy("Constellations")}>
      <div ref={stageRef} className={styles.stage}>
        <div ref={worldRef} className={styles.world}>
          <div className={styles.scene} aria-hidden="true">
            <Image
              src={SCENE}
              alt=""
              fill
              priority
              // Served exactly as encoded. The picture is almost all
              // near-black (its brightest pixel is 107/255), so a second
              // lossy pass through the image optimiser blotches the dust it
              // is made of — and at 51 kB there is nothing to save.
              unoptimized
              placeholder={SCENE_PREVIEW}
              style={{ objectFit: "cover", objectPosition: `${SCENE_X * 100}% 50%` }}
              sizes={`(max-aspect-ratio: ${Math.round(SCENE_ASPECT * 100)}/100) ${Math.round(SCENE_ASPECT * 100)}vh, 100vw`}
            />
          </div>

          <div
            ref={boxRef}
            className={`${styles.box} ${neuron ? styles.focused : ""}`}
            onClick={(e) => {
              if (neuron && e.target === e.currentTarget) setFocusKey(null);
            }}
          >
            <svg className={styles.lines} viewBox={`0 0 ${boxSize.w} ${boxSize.h}`} aria-hidden="true">
              <g ref={linesRef}>
                {sky.constellations.map((c, ci) =>
                  c.lines.map(([a, b], li) => {
                    const sa = starAt.get(a)!;
                    const sb = starAt.get(b)!;
                    return (
                      <path
                        key={`${c.work.key}:${a}:${b}`}
                        data-order={ci + li * 0.5}
                        className={lit(c.work.key) ? styles.lineLit : styles.line}
                        d={`M${sa.x},${sa.y} L${sb.x},${sb.y}`}
                        pathLength={1}
                      />
                    );
                  })
                )}
              </g>
              {/* Wider, invisible: pointing at a line lights its whole figure; a click opens it. */}
              <g>
                {sky.constellations.map((c) =>
                  c.lines.map(([a, b]) => {
                    const sa = starAt.get(a)!;
                    const sb = starAt.get(b)!;
                    return (
                      <path
                        key={`hit:${c.work.key}:${a}:${b}`}
                        className={styles.lineHit}
                        d={`M${sa.x},${sa.y} L${sb.x},${sb.y}`}
                        onMouseEnter={() => setHoveredWork(c.work.key)}
                        onMouseLeave={() => setHoveredWork((w) => (w === c.work.key ? null : w))}
                        onClick={() => open(c.work.key)}
                      />
                    );
                  })
                )}
              </g>
            </svg>

            {sky.constellations.map((c, ci) => (
              <button
                key={c.work.key}
                type="button"
                className={`${styles.title} ${lit(c.work.key) ? styles.titleLit : ""}`}
                style={{ left: c.labelX, top: c.labelY, "--i": ci } as CSSProperties}
                onClick={() => open(c.work.key)}
                onMouseEnter={() => setHoveredWork(c.work.key)}
                onMouseLeave={() => setHoveredWork((w) => (w === c.work.key ? null : w))}
                onFocus={() => setHoveredWork(c.work.key)}
                onBlur={() => setHoveredWork((w) => (w === c.work.key ? null : w))}
                tabIndex={0}
              >
                {c.work.title}
              </button>
            ))}

            {sky.stars.map((s, i) => {
              const person = byUid.get(s.uid);
              if (!person) return null;
              const credits = new Set(person.credits.map((c) => c.work.key)).size;
              const inLit = s.works.some(lit) || s.uid === hovered;
              const className = [styles.star, person.available ? styles.open : "", s.works.length === 0 ? styles.lone : "", inLit ? styles.starLit : "", s.uid === me ? styles.me : ""].join(" ");
              const style = { left: s.x, top: s.y, "--size": `${2.6 + Math.min(credits, 5) * 0.8}px`, "--i": i } as CSSProperties;
              const label = named.has(s.uid) ? (
                <span className={`${styles.name} ${leftNames.has(s.uid) ? styles.nameLeft : ""}`}>
                  {person.name}
                  {s.uid === me ? <small className={styles.you}>{copy("You")}</small> : <small>{roleOf(person)}</small>}
                </span>
              ) : null;
              const events = {
                onMouseEnter: () => enter(s.uid),
                onMouseLeave: () => leave(s.uid),
                onFocus: () => enter(s.uid),
                onBlur: () => leave(s.uid),
                tabIndex: 0,
              };
              return person.handle ? (
                <Link key={s.uid} href={`/people/${person.handle}`} className={className} style={style} aria-label={person.name} {...events}>
                  {label}
                </Link>
              ) : (
                <span key={s.uid} className={className} style={style} aria-label={person.name} {...events}>
                  {label}
                </span>
              );
            })}

            {tip && tipStar ? (() => {
              const className = `${styles.tip} ${neuron ? styles.tipNeuron : ""} ${tipStar.x > boxSize.w - 300 ? styles.tipLeft : ""} ${tipStar.y > boxSize.h * 0.55 ? styles.tipUp : ""}`;
              const style = { left: tipStar.x, top: tipStar.y };
              const card = (
                <>
                  <strong>{tip.name}</strong>
                  <small>{[roleOf(tip), tip.schools[0]].filter(Boolean).join(" · ")}</small>
                  {tipWorks.length > 0 ? <p>{tipWorks.join(", ")}</p> : null}
                  <em>
                    {tip.available ? <><UiText text="Open to work" /> · </> : null}
                    {tip.handle ? <UiText text="View profile" /> : null}
                  </em>
                </>
              );
              const keep = { onMouseEnter: () => enter(tip.uid), onMouseLeave: () => leave(tip.uid) };
              // The whole card opens their profile too.
              return tip.handle ? (
                <Link href={`/people/${tip.handle}`} className={className} style={style} tabIndex={-1} {...keep}>
                  {card}
                </Link>
              ) : (
                <div className={className} style={style} {...keep}>
                  {card}
                </div>
              );
            })() : null}

            {neuron ? (
              <div key={neuron.crew.work.key} className={styles.neuron}>
                <svg className={styles.neuronLines} viewBox={`0 0 ${boxSize.w} ${boxSize.h}`} aria-hidden="true">
                  {neuron.twigs.map((tw) => {
                    const from = neuron.at.get(tw.uid)!;
                    return <path key={`${tw.uid}:${tw.work.key}`} className={styles.twigLine} d={curve(from, tw, 0.12)} pathLength={1} />;
                  })}
                  {neuron.layout.branches.map((b) => (
                    <g key={b.group}>
                      <path className={styles.trunk} d={curve(neuron.center, b.knot, 0.08)} pathLength={1} />
                      {b.members.map((uid) => (
                        <path key={uid} className={styles.branch} d={curve(b.knot, neuron.at.get(uid)!, 0.14)} pathLength={1} />
                      ))}
                    </g>
                  ))}
                </svg>
                <span className={styles.neuronCore} style={{ left: neuron.center.x, top: neuron.center.y }} aria-hidden="true" />
                {isDemoWork(neuron.crew.work) ? (
                  <span
                    className={`${styles.neuronTitle} ${styles[`title_${neuron.layout.title.side}`]}`}
                    style={{ left: neuron.layout.title.x, top: neuron.layout.title.y }}
                  >
                    {neuron.crew.work.title}
                  </span>
                ) : (
                  <Link
                    href={watchHref(neuron.crew.work)}
                    className={`${styles.neuronTitle} ${styles[`title_${neuron.layout.title.side}`]}`}
                    style={{ left: neuron.layout.title.x, top: neuron.layout.title.y }}
                  >
                    {neuron.crew.work.title}
                  </Link>
                )}
                {neuron.layout.branches.map((b) => (
                  <span key={b.group} className={`${styles.groupLabel} ${styles[`group_${b.label.anchor}`]}`} style={{ left: b.label.x, top: b.label.y }}>
                    {copy(GROUP_LABEL[b.group])}
                  </span>
                ))}
                {neuron.layout.nodes.map((n, i) => {
                  const person = byUid.get(n.uid);
                  if (!person) return null;
                  const m = neuron.crew.members.find((x) => x.uid === n.uid)!;
                  // Each comes from their own star in the sky, or from the work.
                  const from = starAt.get(n.uid) ?? neuron.center;
                  const style = {
                    left: n.x,
                    top: n.y,
                    "--dx": `${from.x - n.x}px`,
                    "--dy": `${from.y - n.y}px`,
                    "--o0": starAt.has(n.uid) ? 1 : 0,
                    "--i": i,
                  } as CSSProperties;
                  const className = `${styles.node} ${person.available ? styles.open : ""} ${n.uid === me ? styles.me : ""} ${Math.cos(n.angle) < -0.2 ? styles.nodeLeft : ""}`;
                  const label = (
                    <span className={styles.nodeName}>
                      {person.name}
                      <small>{n.uid === me ? copy("You") : m.character ?? t(`watch.creditRole.${m.role}`)}</small>
                    </span>
                  );
                  const events = { onMouseEnter: () => enter(n.uid), onMouseLeave: () => leave(n.uid), onFocus: () => enter(n.uid), onBlur: () => leave(n.uid) };
                  return person.handle ? (
                    <Link key={n.uid} href={`/people/${person.handle}`} className={className} style={style} aria-label={person.name} {...events}>
                      {label}
                    </Link>
                  ) : (
                    <span key={n.uid} className={className} style={style} aria-label={person.name} tabIndex={0} {...events}>
                      {label}
                    </span>
                  );
                })}
                {neuron.twigs.map((tw) => (
                  <button
                    key={`${tw.uid}:${tw.work.key}`}
                    type="button"
                    className={`${styles.twig} ${Math.cos(tw.angle) < -0.2 ? styles.twigLeft : ""}`}
                    style={{ left: tw.x, top: tw.y }}
                    onClick={() => open(tw.work.key)}
                  >
                    <span>{tw.work.title}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <span className={styles.bottomFade} aria-hidden="true" />
        <span className={styles.scrim} aria-hidden="true" />

        <nav className={styles.sections} aria-label={copy("Society sections")}>
          {SECTIONS.map((section) => (
            <button key={section.id} type="button" aria-current={section.id === "discover" ? "page" : undefined} onClick={() => onOpenSection(section.id)}>
              {copy(section.label)}
            </button>
          ))}
        </nav>

        <aside className={styles.panel}>
          <p className={styles.eyebrow}><UiText text="Constellations" /></p>
          <h1 className={styles.panelTitle}><UiText text="Every work is" /><br /><UiText text="a constellation." /></h1>
          <p className={styles.panelLede}><UiText text="Lines join the people who made a work together. The brightest stars are open to work." /></p>
          {panelWork ? (
            <div className={styles.pick}>
              <p className={styles.eyebrow}>{[copy("{count} people made this together", { count: crew.length }), panelWork.schoolName].filter(Boolean).join(" · ")}</p>
              <div className={styles.pickHead}>
                <h3 className={styles.pickTitle}>{panelWork.title}</h3>
                {sky.constellations.length > 1 ? (
                  <span className={styles.step}>
                    <button type="button" aria-label={copy("Previous work")} onClick={() => step(-1)} tabIndex={0}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                    </button>
                    <button type="button" aria-label={copy("Next work")} onClick={() => step(1)} tabIndex={0}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                    </button>
                  </span>
                ) : null}
              </div>
              <ul className={styles.crew}>
                {crew.slice(0, CREW_MAX).map(({ person, role }) => (
                  <li key={person.uid}>
                    {person.name}
                    <span>{role}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.pickActions}>
                {isDemoWork(panelWork) ? (
                  <span className={`${styles.watch} ${styles.watchDemo}`}><UiText text="A made-up work" /></span>
                ) : (
                  <Link href={watchHref(panelWork)} className={styles.watch} tabIndex={0}>
                    {copy("Watch {title}", { title: panelWork.title })}
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                  </Link>
                )}
                {neuron ? (
                  <button type="button" className={styles.back} onClick={() => setFocusKey(null)} tabIndex={0}>
                    <UiText text="Back to the sky" />
                  </button>
                ) : (
                  <button type="button" className={styles.back} onClick={() => open(panelWork.key)} tabIndex={0}>
                    <UiText text="Meet the crew" />
                  </button>
                )}
              </div>
            </div>
          ) : people && people.length > 0 ? (
            <p className={styles.panelLede}><UiText text="When people here make something together, their stars join into a constellation." /></p>
          ) : null}
          <p className={styles.hint}>
            {neuron ? <UiText text="Pick someone to open their profile. Faint branches lead to their other works." /> : <UiText text="Point at a star to meet them. Pick a title to see its crew." />}
          </p>
        </aside>
      </div>
    </section>
  );
}
