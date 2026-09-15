"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SocietyConnectionsPanel, { type SocietyTabId } from "@/components/society/SocietyConnectionsPanel";
import SocietyRightRail from "@/components/society/SocietyRightRail";
import discoverHero from "../../../discover_hero.webp";
import filmHero from "../../../film_hero.webp";
import styles from "./SocietyPage.module.css";

const SOCIETY_TABS: SocietyTabId[] = ["discover", "connections", "requests", "sent", "works"];
const HERO_TABS: { id: SocietyTabId; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "connections", label: "My Connections" },
  { id: "requests", label: "Requests" },
  { id: "sent", label: "Sent" },
];
const CREATORS = [
  { name: "Mateo Ruiz", role: "Director · AFI", pos: "70% 48%" },
  { name: "Zuri Okafor", role: "Writer · NYU", pos: "82% 42%" },
  { name: "Daniel Cho", role: "Editor · Chapman", pos: "56% 45%" },
  { name: "Safa Rahman", role: "Producer · Columbia", pos: "92% 52%" },
  { name: "Luca Moretti", role: "Cinematographer · LFS", pos: "64% 42%" },
];

function parseSocietyTab(raw: string | null): SocietyTabId {
  if (raw && SOCIETY_TABS.includes(raw as SocietyTabId)) return raw as SocietyTabId;
  return "discover";
}

export default function SocietyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseSocietyTab(searchParams.get("tab"));
  const onTabChange = useCallback((next: SocietyTabId) => {
    router.replace(`/society?tab=${next}`, { scroll: false });
  }, [router]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image src={discoverHero} alt="Student creators working together on a coastal film set" fill priority className={styles.heroImage} sizes="100vw" />
        <div className={styles.heroShade} aria-hidden="true" />

        <div className={styles.heroCopy}>
          <h1>A society<br />of creators.</h1>
          <p>Find the people behind what moves you.</p>
          <nav className={styles.heroTabs} aria-label="Society views">
            {HERO_TABS.map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? styles.activeTab : undefined} onClick={() => onTabChange(item.id)}>{item.label}</button>
            ))}
          </nav>
          <div className={styles.featuredCreator}>
            <h2>Mina Park</h2>
            <p>Director <span>·</span> Penn State</p>
            <div><span>Narrative</span><span>Documentary</span><span>Visual Storytelling</span></div>
            <Link href="/society?tab=connections">Connect <b aria-hidden="true">→</b></Link>
          </div>
        </div>

        <div className={styles.constellation} aria-hidden="true">
          <span className={styles.constellationLineOne} /><span className={styles.constellationLineTwo} /><span className={styles.constellationLineThree} />
          <div className={`${styles.creatorOrb} ${styles.orbOne}`}><Image src={filmHero} alt="" fill sizes="130px" /></div>
          <div className={`${styles.creatorOrb} ${styles.orbTwo}`}><Image src={discoverHero} alt="" fill sizes="130px" /></div>
          <div className={`${styles.creatorOrb} ${styles.orbThree}`}><Image src={discoverHero} alt="" fill sizes="130px" /></div>
        </div>

        <aside className={styles.openRail}>
          <h2>Open to Collaborate <span aria-hidden="true">→</span></h2>
          {["Lea Santos", "Elias Chen", "Noa Kim"].map((name, index) => (
            <article key={name}>
              <div className={styles.railAvatar}><Image src={index === 1 ? filmHero : discoverHero} alt="" fill sizes="66px" /></div>
              <div><strong>{name}</strong><small>{index === 0 ? "Producer · NYU" : index === 1 ? "Cinematographer · UCLA" : "Writer · USC"}</small><p><span>{index === 1 ? "Cinematography" : "Development"}</span><span>{index === 2 ? "TV" : "Travel"}</span></p></div>
            </article>
          ))}
        </aside>

        <section className={styles.watchStrip}>
          <header><h2>Creators to Watch</h2><span aria-hidden="true">›</span></header>
          <div className={styles.creatorCards}>
            {CREATORS.map((creator, index) => (
              <article key={creator.name} className={styles.creatorCard}>
                <Image src={index % 2 ? discoverHero : filmHero} alt="" fill sizes="280px" style={{ objectPosition: creator.pos }} />
                <div><strong>{creator.name}</strong><small>{creator.role}</small></div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className={styles.directory} aria-label="Creator directory">
        <div className={styles.directoryInner}>
          <SocietyConnectionsPanel activeTab={tab} onTabChange={onTabChange} hideTabs />
          {tab !== "works" ? <SocietyRightRail /> : null}
        </div>
      </section>
    </main>
  );
}
