"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { SocietyTabId } from "@/components/society/SocietyNetworkPanel";
import { useTranslations } from "@/context/LocaleContext";
import { primaryRole, type DirPerson } from "@/lib/society-directory";
import { buildSky, type Seat, type SkyStar } from "@/lib/society-sky";
import styles from "./SocietySky.module.css";
import { SKY_IMAGE, SKY_SEATS } from "./skySeats";
import type { SkyDirectory } from "./useSocietyDirectory";
import { useSkyGlide } from "./useSkyGlide";

const SECTIONS: { id: SocietyTabId; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "connections", label: "My Connections" },
  { id: "requests", label: "Requests" },
  { id: "sent", label: "Sent" },
  { id: "works", label: "My Works" },
];

/**
 * The home's night sea with the night sky above it, as one photograph:
 * Society starts on the sea and looks up. The sky above the sea photo is
 * SKY_SHARE of its height (public/images/society/society_sky.jpg is made
 * that way), so with the sea filling the screen the sky is SKY_SHARE of a
 * screen above it.
 */
const SCENE = "/images/society/society_sky.jpg";
const SKY_SHARE = 0.47;
/** The photo's width over the sea's height: its rendered width when it fills the screen's height. */
const SEA_ASPECT = SKY_IMAGE.width / (SKY_IMAGE.height / (1 + SKY_SHARE));
/** Matches .sceneImage's object-position. */
const SCENE_X = 0.64;

/**
 * Where the photograph's real stars land on screen once the view is up in the
 * sky (the scene drawn with object-fit: cover in a box the screen's width and
 * 1 + SKY_SHARE screens tall), keeping those inside the area for figures.
 */
function seatsOnScreen(w: number, h: number): Seat[] {
  const boxH = h * (1 + SKY_SHARE);
  const scale = Math.max(w / SKY_IMAGE.width, boxH / SKY_IMAGE.height);
  const rw = SKY_IMAGE.width * scale;
  const rh = SKY_IMAGE.height * scale;
  const ox = (w - rw) * SCENE_X;
  const oy = boxH - rh;
  // Clear of the header, the panel (on the left on wide screens, below
  // otherwise; SocietySky.module.css) and the clouds.
  const area = w <= 1040
    ? { left: w * 0.06, right: w * 0.94, top: Math.max(96, h * 0.12), bottom: h * 0.64 }
    : { left: w * 0.34, right: w * 0.97, top: Math.max(110, h * 0.13), bottom: h * 0.76 };
  const seats: Seat[] = [];
  for (const [sx, sy, b] of SKY_SEATS) {
    const x = ox + sx * rw;
    const y = oy + sy * rh;
    if (x >= area.left && x <= area.right && y >= area.top && y <= area.bottom) seats.push({ x, y, b });
  }
  return seats;
}
const CREW_MAX = 8;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ramp = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Society's first screen: the home's portal sea. Scrolling tilts the view up
 * into the sky above it, where everyone on OONA is a star and each work they
 * made together is a constellation joining them.
 */
export default function SocietySky({
  directory,
  onOpenSection,
}: {
  directory: SkyDirectory | null;
  onOpenSection: (tab: SocietyTabId) => void;
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
  const [awake, setAwake] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
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

  const roleOf = useCallback(
    (person: DirPerson) => {
      const role = primaryRole(person);
      return role === "crew" ? copy("Creative crew") : t(`watch.creditRole.${role}`);
    },
    [copy, t]
  );

  // One scroll on the sea glides up into the sky, as the credits glide to the home.
  useSkyGlide(sectionRef, !still);

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

  // Scroll drives the tilt, the stars brightening and the lines drawing.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!section || !stage || !world) return;
    let frame = 0;
    let lastAwake = false;
    const apply = () => {
      frame = 0;
      const h = stage.clientHeight;
      const rect = section.getBoundingClientRect();
      const p = still ? 1 : clamp(-rect.top / Math.max(1, rect.height - h), 0, 1);
      world.style.transform = `translate3d(0, ${-h * SKY_SHARE * (1 - smooth(ramp(p, 0, 0.7)))}px, 0)`;
      section.style.setProperty("--intro", String(1 - ramp(p, 0.02, 0.22)));
      section.style.setProperty("--glow", String(ramp(p, 0.15, 0.65)));
      section.style.setProperty("--labels", String(ramp(p, 0.78, 0.94)));
      section.style.setProperty("--panel", String(ramp(p, 0.84, 1)));
      const draw = ramp(p, 0.4, 0.85);
      const paths = linesRef.current?.querySelectorAll<SVGPathElement>("path") ?? [];
      paths.forEach((path) => {
        const order = Number(path.dataset.order ?? 0);
        path.style.strokeDashoffset = String(1 - clamp(draw * 1.6 - order * 0.07, 0, 1));
      });
      const nowAwake = p > 0.8;
      if (nowAwake !== lastAwake) {
        lastAwake = nowAwake;
        setAwake(nowAwake);
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [still, sky]);

  const step = (by: number) => {
    const list = sky.constellations;
    const at = Math.max(0, list.findIndex((c) => c.work.key === selected?.work.key));
    setSelectedKey(list[(at + by + list.length) % list.length]!.work.key);
  };

  const hoveredWorks = hovered ? starAt.get(hovered)?.works ?? [] : [];
  const lit = (key: string) => key === selected?.work.key || hoveredWorks.includes(key);
  const named = new Set([...(selected?.members ?? []), ...(hovered ? [hovered] : []), ...(me && starAt.has(me) ? [me] : [])]);
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
  const tipStar = hovered ? starAt.get(hovered) : null;
  // Everything they made, not just the figure they're in.
  const tipWorks = tip ? [...new Set(tip.credits.map((c) => c.work.title))].slice(0, 3) : [];
  const crew = selected
    ? selected.members.map((uid) => {
        const person = byUid.get(uid)!;
        const credit = person.credits.find((c) => c.work.key === selected.work.key);
        return { person, role: credit ? credit.character ?? t(`watch.creditRole.${credit.role}`) : roleOf(person) };
      })
    : [];

  return (
    <section ref={sectionRef} className={`${styles.sky} ${still ? styles.still : ""} ${awake ? styles.isAwake : ""}`} aria-label={copy("Constellations")}>
      <div ref={stageRef} className={styles.stage}>
        <div ref={worldRef} className={styles.world}>
          <div className={styles.scene} aria-hidden="true">
            <Image
              src={SCENE}
              alt=""
              fill
              priority
              sizes={`(max-aspect-ratio: ${Math.round(SEA_ASPECT * 100)}/100) ${Math.round(SEA_ASPECT * 100)}vh, 100vw`}
              className={styles.sceneImage}
            />
          </div>

          <div ref={boxRef} className={`${styles.box} ${awake ? styles.awake : ""}`}>
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
            </svg>

            {sky.constellations.map((c, ci) => (
              <button
                key={c.work.key}
                type="button"
                className={`${styles.title} ${lit(c.work.key) ? styles.titleLit : ""}`}
                style={{ left: c.labelX, top: c.labelY, "--i": ci } as CSSProperties}
                onClick={() => setSelectedKey(c.work.key)}
                tabIndex={awake ? 0 : -1}
              >
                {c.work.title}
              </button>
            ))}

            {sky.stars.map((s, i) => {
              const person = byUid.get(s.uid);
              if (!person) return null;
              const credits = new Set(person.credits.map((c) => c.work.key)).size;
              const inLit = s.works.some(lit);
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
                tabIndex: awake ? 0 : -1,
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
              const className = `${styles.tip} ${tipStar.x > boxSize.w - 300 ? styles.tipLeft : ""} ${tipStar.y > boxSize.h * 0.55 ? styles.tipUp : ""}`;
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

        <div className={styles.intro}>
          <p className={styles.eyebrow}>OONA Society</p>
          <h1 className={styles.heading}><UiText text="Look up." /></h1>
          <p className={styles.lede}><UiText text="Above the same sea, everyone who makes something on OONA is a star, and every work they made together is a constellation." /></p>
        </div>
        <div className={styles.cue} aria-hidden="true"><UiText text="Scroll to look up" /><i /></div>

        <aside className={`${styles.panel} ${awake ? styles.awake : ""}`}>
          <p className={styles.eyebrow}><UiText text="Constellations" /></p>
          <h2 className={styles.panelTitle}><UiText text="Every work is" /><br /><UiText text="a constellation." /></h2>
          <p className={styles.panelLede}><UiText text="Lines join the people who made a work together. The brightest stars are open to work." /></p>
          {selected ? (
            <div className={styles.pick}>
              <p className={styles.eyebrow}>{[copy("{count} people made this together", { count: selected.members.length }), selected.work.schoolName].filter(Boolean).join(" · ")}</p>
              <div className={styles.pickHead}>
                <h3 className={styles.pickTitle}>{selected.work.title}</h3>
                {sky.constellations.length > 1 ? (
                  <span className={styles.step}>
                    <button type="button" aria-label={copy("Previous work")} onClick={() => step(-1)} tabIndex={awake ? 0 : -1}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                    </button>
                    <button type="button" aria-label={copy("Next work")} onClick={() => step(1)} tabIndex={awake ? 0 : -1}>
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
              <Link href={`/watch/${selected.work.ownerUid}/${selected.work.workId}`} className={styles.watch} tabIndex={awake ? 0 : -1}>
                {copy("Watch {title}", { title: selected.work.title })}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </Link>
            </div>
          ) : people && people.length > 0 ? (
            <p className={styles.panelLede}><UiText text="When people here make something together, their stars join into a constellation." /></p>
          ) : null}
          <p className={styles.hint}><UiText text="Point at a star to meet them. Pick a title to see its crew." /></p>
        </aside>
      </div>
    </section>
  );
}
