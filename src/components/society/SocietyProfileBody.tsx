"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProfileWorkListItem } from "@/components/profile/ProfileWorksVerticalList";
import { gradientForTitle } from "@/lib/works/catalog-ui";
import styles from "./EditorialProfile.module.css";

function WorkImage({ work }: { work: ProfileWorkListItem }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [work.thumbnailUrl]);
  return <div className={styles.workImage}>{work.thumbnailUrl && !failed ? <Image src={work.thumbnailUrl} alt="" fill unoptimized onError={() => setFailed(true)} /> : <i style={{ background: gradientForTitle(work.title) }} />}</div>;
}

export default function SocietyProfileBody({ works, isSelf }: { works: ProfileWorkListItem[]; isSelf: boolean }) {
  return <section id="works" className={styles.worksSection}>
    <header><div><p>{isSelf ? "YOUR PORTFOLIO" : "SELECTED WORK"}</p><h2>{isSelf ? "My works" : "Stories and collaborations"}</h2></div>{isSelf && <div><Link href="/uploader/upload">＋ Upload a work</Link><Link href="/uploader/works">Manage works ↗</Link></div>}</header>
    {works.length ? <div className={styles.workGrid}>{works.map((work) => <article key={`${work.ownerUid}-${work.workId}`}><Link href={work.watchPath}><WorkImage work={work} /><div><h3>{work.title}</h3><p>{work.role}{work.characterName ? ` · ${work.characterName}` : ""}</p>{work.profileNote && <span>{work.profileNote}</span>}</div></Link>{isSelf && <Link className={styles.editWork} href={`/uploader/works/${work.workId}/edit`}>Edit work ↗</Link>}</article>)}</div> : <div className={styles.emptyWorks}><p>{isSelf ? "Your next work can begin here." : "No published works yet."}</p>{isSelf && <Link href="/uploader/upload">Upload the first work →</Link>}</div>}
  </section>;
}
