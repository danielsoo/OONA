"use client";

import { useState } from "react";
import UiText, { useUiCopy } from "@/components/i18n/UiText";
import SocietyLoginDialog from "@/components/society/SocietyLoginDialog";
import type { SocietyTabId } from "@/components/society/SocietyNetworkPanel";
import { useAuth } from "@/context/AuthContext";
import type { Directory } from "@/lib/society-directory";
import DesignConstellation from "./DesignConstellation";
import DesignContactSheet from "./DesignContactSheet";
import DesignEndCredits from "./DesignEndCredits";
import DesignIndex from "./DesignIndex";
import DesignNightCatalog from "./DesignNightCatalog";
import DesignSpotlight from "./DesignSpotlight";
import type { SocietyDesignId } from "./societyDesigns";
import { useSocietyDirectory } from "./useSocietyDirectory";
import styles from "./shell.module.css";

const SECTIONS: { id: SocietyTabId; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "connections", label: "My Connections" },
  { id: "requests", label: "Requests" },
  { id: "sent", label: "Sent" },
  { id: "works", label: "My Works" },
];

const DESIGNS: Record<Exclude<SocietyDesignId, "current">, (props: Directory) => React.ReactNode> = {
  a: DesignNightCatalog,
  b: DesignEndCredits,
  c: DesignConstellation,
  d: DesignContactSheet,
  e: DesignIndex,
  f: DesignSpotlight,
};

/**
 * Society's Discover in one of the design variants. The other sections
 * (connections, invitations, your works) stay in the current design.
 */
export default function SocietyDesignView({
  design,
  onTabChange,
}: {
  design: Exclude<SocietyDesignId, "current">;
  onTabChange: (tab: SocietyTabId) => void;
}) {
  const copy = useUiCopy();
  const { user, loading: authLoading } = useAuth();
  const { directory, failed } = useSocietyDirectory();
  const [loginReturnTo, setLoginReturnTo] = useState<string | null>(null);
  const Design = DESIGNS[design];

  const openSection = (tab: SocietyTabId) => {
    if (tab === "discover" || authLoading) return;
    if (!user) setLoginReturnTo(`/society?tab=${tab}`);
    else onTabChange(tab);
  };

  return (
    <div className={styles.page} data-society-design={design}>
      <nav className={styles.sections} aria-label={copy("Society sections")}>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            aria-current={section.id === "discover" ? "page" : undefined}
            onClick={() => openSection(section.id)}
          >
            {copy(section.label)}
          </button>
        ))}
      </nav>

      {directory === null ? (
        <p className={styles.status} role="status"><UiText text="Finding creators…" /></p>
      ) : failed || directory.people.length === 0 ? (
        <p className={styles.status}><UiText text="No creators to show yet." /></p>
      ) : (
        <Design people={directory.people} works={directory.works} />
      )}

      <SocietyLoginDialog open={!authLoading && !user && loginReturnTo !== null} returnTo={loginReturnTo ?? "/society"} onClose={() => setLoginReturnTo(null)} />
    </div>
  );
}
