"use client";

import { useEffect, useRef, useState } from "react";
import {
  createSchoolsScene,
  type SchoolsScene,
  type SpaceFrame,
  type SpaceSchool,
  type SpaceTuning,
  type SpaceView,
} from "./schoolsScene";

export type SpaceLabelSchool = SpaceSchool & { meta: string };

type Props = {
  schools: SpaceLabelSchool[];
  view: SpaceView;
  tuning: SpaceTuning;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Elements laid over the scene (the ranking panel, the legend, the controls); names keep clear of them. */
  avoid: string[];
  /** The panel the scene centres beside, when it sits over the canvas. */
  panel: string;
};

type Label = { id: string; x: number; y: number; w: number; align: "center" | "left" | "right"; minor: boolean };

/**
 * The schools as worlds in space (schoolsScene.ts), with each name set beside
 * its world in the page's own type. Click a world or its name to pick the
 * school, as the ranking does.
 */
export default function SchoolsSpace({ schools, view, tuning, selectedId, onSelect, avoid, panel }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SchoolsScene | null>(null);
  const [failed, setFailed] = useState(false);
  const [frame, setFrame] = useState<SpaceFrame | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // The scene itself, once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      sceneRef.current = createSchoolsScene(canvas);
    } catch {
      setFailed(true);
      return;
    }
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Follow the size of the space it fills.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      setBox((prev) => (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: Math.round(width), h: Math.round(height) }));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // Rebuild whenever what it shows changes.
  useEffect(() => {
    const scene = sceneRef.current;
    const host = hostRef.current;
    if (!scene || !host || box.w < 10 || box.h < 10 || schools.length === 0) return;
    const hostRect = host.getBoundingClientRect();
    const panelEl = document.querySelector(panel);
    const panelRect = panelEl?.getBoundingClientRect();
    const covers = panelRect && panelRect.left < hostRect.right && panelRect.top < hostRect.bottom && panelRect.bottom > hostRect.top && getComputedStyle(panelEl!).position === "absolute";
    const raf = requestAnimationFrame(() => {
      const next = scene.build({ schools, view, tuning, width: box.w, height: box.h, panelLeft: covers ? panelRect.left - hostRect.left : null });
      setFrame(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [schools, view, tuning, box, panel]);

  // Slow spin, only while the scene is on screen and the tab is in front.
  useEffect(() => {
    const scene = sceneRef.current;
    const host = hostRef.current;
    if (!scene || !host || !frame) return;
    let visible = true;
    let raf = 0;
    const loop = (now: number) => {
      if (visible && document.visibilityState === "visible" && scene.tick(now)) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      scene.resetClock();
      if (scene.isSpinning()) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) start();
    });
    io.observe(host);
    const onVisibility = () => document.visibilityState === "visible" && start();
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [frame]);

  // Set the names: under each world, else above, right or left; never over another world, name or panel.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !frame) return;
    const hostRect = host.getBoundingClientRect();
    const W = hostRect.width, H = hostRect.height;
    const narrow = W < 700;
    const placed = avoid.flatMap((selector) => [...document.querySelectorAll(selector)]).map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - hostRect.left - 10, y: r.top - hostRect.top - 10, w: r.width + 20, h: r.height + 20 };
    });
    const discs = [...frame.worlds, ...(frame.star ? [{ id: "", rank: 0, ...frame.star }] : [])];
    const hitsRect = (r: { x: number; y: number; w: number; h: number }) =>
      r.x < 8 || r.x + r.w > W - 8 || r.y < 8 || r.y + r.h > H - 8
      || placed.some((p) => r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y);
    const hitsDisc = (r: { x: number; y: number; w: number; h: number }, self: string) => discs.some((o) => {
      if (o.id === self || o.r < 2) return false;
      const cx = Math.max(r.x, Math.min(o.x, r.x + r.w)), cy = Math.max(r.y, Math.min(o.y, r.y + r.h));
      return Math.hypot(cx - o.x, cy - o.y) < o.r + 4;
    });
    const byId = new Map(schools.map((s) => [s.id, s]));
    const next: Label[] = [];
    // The school you picked is named first, so its name always finds a place.
    const order = [...frame.worlds].sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : a.rank - b.rank));
    for (const world of order) {
      const school = byId.get(world.id);
      if (!school || (narrow && world.rank > 10 && world.id !== selectedId)) continue;
      const minor = school.value < 200;
      const w = Math.ceil(Math.max(school.name.length * (minor ? 6.4 : 7.2), school.meta.length * 6.3)) + 6, h = 32;
      const { x, y, r } = world;
      const tries: [number, number, Label["align"]][] = [
        [x - w / 2, y + r + 6, "center"], [x - w / 2, y - r - 6 - h, "center"],
        [x + r + 9, y - h / 2, "left"], [x - r - 9 - w, y - h / 2, "right"],
        [x + r * 0.7 + 6, y + r * 0.7, "left"], [x - r * 0.7 - 6 - w, y + r * 0.7, "right"],
      ];
      const picked = world.id === selectedId;
      // Clear of everything if it can be; the picked school's name may lie over a neighbour rather than go missing.
      const spot = tries.find(([lx, ly]) => !hitsRect({ x: lx, y: ly, w, h }) && !hitsDisc({ x: lx, y: ly, w, h }, world.id))
        ?? (picked ? tries.find(([lx, ly]) => lx > 4 && lx + w < W - 4 && ly > 4 && ly + h < H - 4) ?? tries[0] : undefined);
      if (spot) {
        const [lx, ly, align] = spot;
        placed.push({ x: lx, y: ly, w, h });
        next.push({ id: world.id, x: lx, y: ly, w, align, minor });
      }
    }
    setLabels(next);
  }, [frame, schools, avoid, selectedId]);

  const pickAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return sceneRef.current?.pick(event.clientX - rect.left, event.clientY - rect.top) ?? null;
  };

  const byId = new Map(schools.map((s) => [s.id, s]));
  const ringFor = (id: string | null) => frame?.worlds.find((w) => w.id === id);
  const selected = ringFor(selectedId);
  const hover = hovered && hovered !== selectedId ? ringFor(hovered) : undefined;

  return (
    <div ref={hostRef} className="space-stage">
      <canvas
        ref={canvasRef}
        className="space-canvas"
        style={{ cursor: hovered ? "pointer" : "default" }}
        aria-hidden="true"
        onPointerMove={(event) => setHovered(pickAt(event))}
        onPointerLeave={() => setHovered(null)}
        onClick={(event) => {
          const id = pickAt(event as unknown as React.PointerEvent<HTMLCanvasElement>);
          if (id) onSelect(id);
        }}
      />
      {failed ? null : (
        <div className="space-labels">
          {[selected, hover].map((w, i) => w ? (
            <span
              key={`ring-${i}`}
              className={`space-ring${i === 0 ? " is-selected" : ""}`}
              style={{ left: w.x, top: w.y, width: w.r * 2 + 18, height: w.r * 2 + 18 }}
              aria-hidden="true"
            />
          ) : null)}
          {labels.map((label) => {
            const school = byId.get(label.id);
            if (!school) return null;
            const on = label.id === selectedId || label.id === hovered;
            return (
              <button
                key={label.id}
                type="button"
                className={`space-label is-${label.align}${label.minor ? " is-minor" : ""}${on ? " is-on" : ""}`}
                style={{ left: label.x, top: label.y, width: label.w }}
                aria-pressed={label.id === selectedId}
                onClick={() => onSelect(label.id)}
                onPointerEnter={() => setHovered(label.id)}
                onPointerLeave={() => setHovered(null)}
              >
                <strong>{school.name}</strong>
                <small>{school.meta}</small>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
