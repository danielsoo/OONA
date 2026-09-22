"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProfileWorkListItem } from "@/components/profile/ProfileWorksVerticalList";
import { gradientForTitle } from "@/lib/works/catalog-ui";
import styles from "./EditorialProfile.module.css";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

function WorkImage({ work }: { work: ProfileWorkListItem }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [work.thumbnailUrl]);
  return <div className={styles.workImage}>{work.thumbnailUrl && !failed ? <Image src={work.thumbnailUrl} alt="" fill unoptimized onError={() => setFailed(true)} /> : <i style={{ background: gradientForTitle(work.title) }} />}</div>;
}

export default function SocietyProfileBody({ works, isSelf }: { works: ProfileWorkListItem[]; isSelf: boolean }) {
  const _copy = useUiCopy();
  return <section id="works" className={styles.worksSection}>
    <header><div><p>{isSelf ? _copy("YOUR PORTFOLIO") : _copy("SELECTED WORK")}</p><h2>{isSelf ? _copy("My works") : _copy("Stories and collaborations")}</h2></div>{isSelf && <div><Link href="/uploader/upload"><UiText text={"＋ Upload a work"} /></Link><Link href="/uploader/works"><UiText text={"Manage works ↗"} /></Link></div>}</header>
    {works.length ? <div className={styles.workGrid}>{works.map((work) => <article key={`${work.ownerUid}-${work.workId}`}><Link href={work.watchPath}><WorkImage work={work} /><div><h3>{work.title}</h3><p>{work.role}{work.characterName ? ` · ${work.characterName}` : ""}</p>{work.profileNote && <span>{work.profileNote}</span>}</div></Link>{isSelf && <Link className={styles.editWork} href={`/uploader/works/${work.workId}/edit`}><UiText text={"Edit work ↗"} /></Link>}</article>)}</div> : <div className={styles.emptyWorks}><p>{isSelf ? _copy("Your next work can begin here.") : _copy("No published works yet.")}</p>{isSelf && <Link href="/uploader/upload"><UiText text={"Upload the first work →"} /></Link>}</div>}
  </section>;
}
