"use client";

import UiText, { useUiCopy } from "@/components/i18n/UiText";
import { AVATAR_PRESET_GROUPS } from "@/lib/avatarPresets";

type Props = {
  /** The avatar in force, so the one already chosen reads as chosen. */
  current?: string | null;
  disabled?: boolean;
  onPick: (src: string) => void;
};

/**
 * Pick a profile picture without uploading one. The same row sits in the
 * account hero and in the profile workspace, so both ways into the profile
 * offer the same set.
 */
export default function AvatarPresetPicker({ current, disabled = false, onPick }: Props) {
  const copy = useUiCopy();
  return (
    <div className="space-y-3">
      <p className="text-xs text-xiio-muted">
        <UiText text="Or pick one of ours" />
      </p>
      {AVATAR_PRESET_GROUPS.map((group) => (
        <div key={group.id} className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-xiio-muted">{copy(group.label)}</p>
          <div className="flex flex-wrap gap-2">
            {group.presets.map((preset) => {
              const chosen = current === preset.src;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={chosen}
                  aria-label={copy(preset.label)}
                  title={copy(preset.label)}
                  onClick={() => onPick(preset.src)}
                  className={`h-11 w-11 rounded-full overflow-hidden border transition disabled:opacity-40 ${
                    chosen
                      ? "border-xiio-accent ring-2 ring-xiio-accent/60"
                      : "border-white/15 hover:border-white/40"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
