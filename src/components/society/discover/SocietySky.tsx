"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import type { SocietyTabId } from "@/components/society/SocietyNetworkPanel";
import { useTranslations } from "@/context/LocaleContext";
import { primaryRole, type DirPerson } from "@/lib/society-directory";
import { buildSky } from "@/lib/society-sky";
import { drawStarfield } from "./starfield";
import styles from "./SocietySky.module.css";
import { useSkyGlide } from "./useSkyGlide";

const SECTIONS: { id: SocietyTabId; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "connections", label: "My Connections" },
  { id: "requests", label: "Requests" },
  { id: "sent", label: "Sent" },
  { id: "works", label: "My Works" },
];

/** The home's night sea: Society starts there and looks up. */
const SEA = "/images/home/home_portal_night_photo.jpg";
/** How much sky lies above the photo, as a share of the screen's height. */
const SKY_SHARE = 0.47;
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
  people,
  onOpenSection,
}: {
  people: DirPerson[] | null;
  onOpenSection: (tab: SocietyTabId) => void;
}) {
  const copy = useUiCopy();
  const { t } = useTranslations();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SVGGElement>(null);
  const [boxSize, setBoxSize] = useState({ w: 1700, h: 1000 });
  const aspect = Math.round((boxSize.w / boxSize.h) * 10) / 10;
  const [narrow, setNarrow] = useState(false);
  const [still, setStill] = useState(false);
  const [awake, setAwake] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const byUid = useMemo(() => new Map((people ?? []).map((p) => [p.uid, p])), [people]);
  // A phone's sky holds fewer figures, so their names have room.
  const sky = useMemo(() => buildSky(people ?? [], { aspect, maxConstellations: narrow ? 5 : undefined }), [people, aspect, narrow]);
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

  // Paint the stars, and lay the constellations out for the box's shape.
  useEffect(() => {
    const paint = () => {
      const stage = stageRef.current;
      const canvas = canvasRef.current;
      const box = boxRef.current;
      if (!stage || !canvas) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const skyH = h * SKY_SHARE;
      // Into the photo's own sky, thinning out well before its clouds.
      const height = skyH + h * 0.32;
      canvas.style.height = `${height}px`;
      drawStarfield(canvas, { width: w, height, ratio: Math.min(2, window.devicePixelRatio || 1), fadeFrom: skyH - h * 0.04, fadeTo: height });
      if (box) setBoxSize({ w: Math.max(1, box.clientWidth), h: Math.max(1, box.clientHeight) });
      setNarrow(w < 600);
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
  const named = new Set([...(selected?.members ?? []), ...(hovered ? [hovered] : [])]);
  const tip = hovered ? byUid.get(hovered) : null;
  const tipStar = hovered ? starAt.get(hovered) : null;
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
          <div className={styles.skyBg} aria-hidden="true" />
          <canvas ref={canvasRef} className={styles.stars} aria-hidden="true" />
          <div className={styles.sea} aria-hidden="true">
            <Image src={SEA} alt="" fill priority sizes="100vw" className={styles.seaImage} />
          </div>
          <div className={styles.seam} aria-hidden="true" />

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
                        d={`M${sa.x * boxSize.w},${sa.y * boxSize.h} L${sb.x * boxSize.w},${sb.y * boxSize.h}`}
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
                style={{ left: `${c.labelX * 100}%`, top: `${c.labelY * 100}%`, "--i": ci } as CSSProperties}
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
              const className = [styles.star, person.available ? styles.open : "", s.works.length === 0 ? styles.lone : "", inLit ? styles.starLit : ""].join(" ");
              const style = { left: `${s.x * 100}%`, top: `${s.y * 100}%`, "--size": `${3 + Math.min(credits, 5) * 1.1}px`, "--i": i } as CSSProperties;
              const label = named.has(s.uid) ? (
                <span className={`${styles.name} ${s.x > 0.72 ? styles.nameLeft : ""}`}>
                  {person.name}
                  <small>{roleOf(person)}</small>
                </span>
              ) : null;
              const events = {
                onMouseEnter: () => setHovered(s.uid),
                onMouseLeave: () => setHovered((h) => (h === s.uid ? null : h)),
                onFocus: () => setHovered(s.uid),
                onBlur: () => setHovered((h) => (h === s.uid ? null : h)),
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

            {tip && tipStar ? (
              <div
                className={`${styles.tip} ${tipStar.x > 0.62 ? styles.tipLeft : ""} ${tipStar.y > 0.62 ? styles.tipUp : ""}`}
                style={{ left: `${tipStar.x * 100}%`, top: `${tipStar.y * 100}%` }}
                role="status"
              >
                <strong>{tip.name}</strong>
                <small>{[roleOf(tip), tip.schools[0]].filter(Boolean).join(" · ")}</small>
                {tipStar.works.length > 0 ? (
                  <p>{tipStar.works.map((k) => sky.constellations.find((c) => c.work.key === k)?.work.title).filter(Boolean).join(", ")}</p>
                ) : null}
                <em>
                  {tip.available ? <><UiText text="Open to work" /> · </> : null}
                  {tip.handle ? <UiText text="View profile" /> : null}
                </em>
              </div>
            ) : null}
          </div>
        </div>

        <span className={styles.bottomFade} aria-hidden="true" />

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
