"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DemoBadge from "@/components/society/DemoBadge";
import { isDemoVisit } from "@/lib/demo-flags";

/** Pages that only exist in the demo: a made-up person's profile or portfolio. */
const DEMO_ONLY = /^\/(people|p)\/demo-/;

/**
 * The demo's badge on every page while the demo is on (or on a page that
 * only exists in it), so it's always plain that what's on screen is made up,
 * with the way out. Decided once in the browser, like the demo itself.
 */
export default function DemoBadgeGate() {
  const pathname = usePathname() ?? "/";
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoVisit()), []);
  return demo || DEMO_ONLY.test(pathname) ? <DemoBadge active /> : null;
}
