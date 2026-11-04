"use client";

import { useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import { DEFAULT_TUNING, type SpaceTuning, type SpaceView } from "./spaceTuning";

type Slider = { key: Exclude<keyof SpaceTuning, "spin">; label: string; min: number; max: number; step: number; levelOnly?: boolean };

const SLIDERS: Slider[] = [
  { key: "cameraHeight", label: "Camera height", min: 4, max: 90, step: 1, levelOnly: true },
  { key: "size", label: "Planet size", min: 0.5, max: 1.8, step: 0.05 },
  { key: "depth", label: "Depth of field", min: 0, max: 2.5, step: 0.05 },
  { key: "haze", label: "Distance haze", min: 0, max: 1.6, step: 0.05 },
  { key: "night", label: "Night-side light", min: 0, max: 4, step: 0.1 },
  { key: "sky", label: "Sky", min: 0, max: 2, step: 0.05 },
  { key: "brightness", label: "Brightness", min: 0.5, max: 1.8, step: 0.05 },
];

type Props = {
  view: SpaceView;
  onView: (view: SpaceView) => void;
  tuning: SpaceTuning;
  onTuning: (tuning: SpaceTuning) => void;
};

/** The two views of the schools space, and the knobs that shape them (open to everyone while the look is being settled). */
export default function SpaceControls({ view, onView, tuning, onTuning }: Props) {
  const copy = useUiCopy();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySettings = async () => {
    const text = JSON.stringify({ view, ...tuning });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(copy("Copy settings"), text);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-toolbar">
      <div className="space-views" role="group" aria-label={copy("View")}>
        <span><UiText text="View" /></span>
        {(["level", "open"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} className={view === v ? "on" : undefined} onClick={() => onView(v)}>
            {v === "level" ? <UiText text="Level view" /> : <UiText text="Open space" />}
          </button>
        ))}
        <button type="button" className={`space-adjust${open ? " on" : ""}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <UiText text="Adjust" />
        </button>
      </div>

      {open ? (
        <div className="space-tune">
          {SLIDERS.filter((s) => !s.levelOnly || view === "level").map((s) => (
            <label key={s.key}>
              <span>
                <UiText text={s.label} />
                <output>{tuning[s.key].toFixed(s.step < 1 ? 2 : 0)}</output>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={tuning[s.key]}
                onChange={(event) => onTuning({ ...tuning, [s.key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <label className="space-tune-check">
            <input type="checkbox" checked={tuning.spin} onChange={(event) => onTuning({ ...tuning, spin: event.target.checked })} />
            <UiText text="Slow spin" />
          </label>
          <div className="space-tune-actions">
            <button type="button" onClick={() => onTuning(DEFAULT_TUNING[view])}><UiText text="Reset" /></button>
            <button type="button" onClick={() => void copySettings()}>{copied ? <UiText text="Copied" /> : <UiText text="Copy settings" />}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
