"use client";

import { useEffect, useState } from "react";
import { isDemoVisit } from "@/lib/demo-flags";

/**
 * Whether this tab is in the demo, for anything rendered.
 *
 * Decided after mounting, like the demo itself: the server always renders the
 * real site, so reading it while rendering would disagree with the HTML that
 * came down. Outside rendering — in a save handler — call isDemoVisit().
 */
export function useIsDemoVisit(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoVisit()), []);
  return demo;
}
