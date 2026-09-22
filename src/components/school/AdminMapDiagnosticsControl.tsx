"use client";

import { useEffect } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import UiText from "@/components/i18n/UiText";

type AdminMapDiagnosticsControlProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export default function AdminMapDiagnosticsControl({
  enabled,
  onChange,
}: AdminMapDiagnosticsControlProps) {
  const { isAdmin, checked } = useAdminAccess();

  useEffect(() => {
    if (checked && !isAdmin && enabled) onChange(false);
  }, [checked, enabled, isAdmin, onChange]);

  if (!checked || !isAdmin) return null;

  return (
    <button
      type="button"
      className={`coordinate-toggle${enabled ? " active" : ""}`}
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
    >
      <span className="coordinate-toggle-dot" aria-hidden="true" /><UiText text={"Map diagnostics"} /></button>
  );
}
