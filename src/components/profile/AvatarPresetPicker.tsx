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
      <p className="text-xs tracking-[0.04em] text-[rgba(196,214,236,0.62)]">
        <UiText text="Or pick one of ours" />
      </p>
      {AVATAR_PRESET_GROUPS.map((group) => (
        <div key={group.id} className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9bb9dc]">{copy(group.label)}</p>
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
                  className={`h-11 w-11 rounded-full overflow-hidden border transition disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fdcff] ${
                    chosen
                      ? "border-[rgba(119,203,255,0.86)] shadow-[0_0_0_2px_rgba(119,203,255,0.35),0_0_16px_rgba(61,163,232,0.3)]"
                      : "border-[rgba(179,206,230,0.22)] hover:border-[rgba(119,203,255,0.6)]"
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
