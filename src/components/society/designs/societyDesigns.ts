"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";

/**
 * Design variants of the Society page (Discover), to compare on the live site
 * with real people and credits. Visitors only ever see the current design;
 * the toggle shows for admins and for anyone who opens /society?designs
 * (or a /society?design=<id> link), and that choice is remembered on the device.
 */
export const SOCIETY_DESIGNS = [
  { id: "current", short: "Now", name: "Current design" },
  { id: "a", short: "A", name: "Night catalog" },
  { id: "b", short: "B", name: "End credits" },
  { id: "c", short: "C", name: "Constellation" },
  { id: "d", short: "D", name: "Contact sheet" },
  { id: "e", short: "E", name: "Index" },
  { id: "f", short: "F", name: "Spotlight" },
] as const;

export type SocietyDesignId = (typeof SOCIETY_DESIGNS)[number]["id"];

const DESIGN_KEY = "oona.societyDesign";
const OPT_IN_KEY = "oona.societyDesigns";

function isDesignId(value: string | null | undefined): value is SocietyDesignId {
  return SOCIETY_DESIGNS.some((design) => design.id === value);
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

/** Puts `?design=<id>` in the address (so the view can be shared), keeping the other params. */
function syncUrl(design: SocietyDesignId | null) {
  const url = new URL(window.location.href);
  url.searchParams.delete("designs");
  if (design && design !== "current") url.searchParams.set("design", design);
  else url.searchParams.delete("design");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useSocietyDesign() {
  const { isAdmin } = useAdminAccess();
  const [chosen, setChosen] = useState<SocietyDesignId>("current");
  const [optedIn, setOptedIn] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("design");
    const asked = params.has("designs") || isDesignId(fromUrl);
    if (asked) write(OPT_IN_KEY, "1");
    if (isDesignId(fromUrl)) write(DESIGN_KEY, fromUrl);
    setOptedIn(asked || read(OPT_IN_KEY) === "1");
    const stored = read(DESIGN_KEY);
    setChosen(isDesignId(fromUrl) ? fromUrl : isDesignId(stored) ? stored : "current");
  }, []);

  const visible = (optedIn || isAdmin) && !dismissed;

  const choose = useCallback((design: SocietyDesignId) => {
    setChosen(design);
    write(DESIGN_KEY, design);
    syncUrl(design);
  }, []);

  /** Back to the current design, and the toggle goes away on this device. */
  const close = useCallback(() => {
    setChosen("current");
    setOptedIn(false);
    setDismissed(true);
    write(DESIGN_KEY, null);
    write(OPT_IN_KEY, null);
    syncUrl(null);
  }, []);

  return { design: visible ? chosen : ("current" as SocietyDesignId), visible, choose, close };
}
