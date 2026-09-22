"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import type { ProjectDetail, ProjectMilestone, ProjectStatus } from "@/types/project";
import filmHero from "../../../film_hero.webp";
import styles from "./ProjectWorkspace.module.css";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

const TABS = ["overview", "members", "milestones", "files", "credits", "activity"] as const;
type Tab = typeof TABS[number];

function statusLabel(status: ProjectStatus) {
  return status === "in_production" ? "In Production" : status === "post_production" ? "Post Production" : status === "complete" ? "Complete" : "Development";
}

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const _copy = useUiCopy();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: Tab = TABS.includes(rawTab as Tab) ? rawTab as Tab : "overview";
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState("");

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    if (!user) throw new Error("login_required");
    const token = await user.getIdToken();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await authFetch(`/api/me/projects/${projectId}`);
      const data = await response.json() as { project?: ProjectDetail; message?: string };
      if (!response.ok || !data.project) { setError(data.message || "This project is not available."); return; }
      setProject(data.project); setError(null);
    } catch { setError("This project could not be loaded."); } finally { setLoading(false); }
  }, [authFetch, projectId, user]);

  useEffect(() => { if (!authLoading && !user) router.replace(`/login?returnTo=${encodeURIComponent(`/projects/${projectId}`)}`); }, [authLoading, projectId, router, user]);
  useEffect(() => { void load(); }, [load]);

  const savePatch = async (patch: Record<string, unknown>) => {
    const response = await authFetch(`/api/me/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!response.ok) return false;
    await load(); return true;
  };

  const completedMilestones = useMemo(() => project?.milestones.filter((item) => item.complete).length ?? 0, [project]);
  const nextMilestone = project?.milestones.find((item) => !item.complete);

  const addMilestone = async () => {
    if (!project || !milestoneTitle.trim()) return;
    const milestone: ProjectMilestone = { id: crypto.randomUUID(), title: milestoneTitle.trim(), complete: false };
    if (await savePatch({ milestones: [...project.milestones, milestone] })) setMilestoneTitle("");
  };

  const toggleMilestone = async (id: string) => {
    if (!project) return;
    await savePatch({ milestones: project.milestones.map((item) => item.id === id ? { ...item, complete: !item.complete } : item) });
  };

  const requestReview = async () => {
    if (!project?.workId) { setMessage("Upload and connect a work before requesting review."); return; }
    const response = await authFetch(`/api/me/works/${project.workId}/submit-for-review`, { method: "POST" });
    setMessage(response.ok ? "The work was sent for review." : "Review could not be requested yet. Check the work details first.");
  };

  if (loading || authLoading) return <main className={styles.state}><UiText text={"Opening project…"} /></main>;
  if (error || !project) return <main className={styles.state}><h1><UiText text={"Project unavailable"} /></h1><p>{error ? _copy(error) : null}</p><Link href="/society?tab=works"><UiText text={"Return to Society"} /></Link></main>;
  const isOwner = project.ownerUid === user?.uid;

  return (
    <main className={styles.page}>
      <div className={styles.kicker}><span>03</span>{" "}<UiText text={"PROJECT WORKSPACE"} />{" "}<small><UiText text={"Plan. Create. Share."} /></small></div>
      <section className={styles.workspace}>
        <header className={styles.projectHeader}>
          <div className={styles.cover}>{project.coverUrl ? <Image src={project.coverUrl} alt="" fill unoptimized /> : <Image src={filmHero} alt="" fill />}</div>
          <div className={styles.identity}><p>{project.category || "OONA"} <b>·</b> <i /> {_copy(statusLabel(project.status))}</p><h1>{project.title}</h1><span>{project.description || _copy("A shared place for your team to shape the work, exchange feedback, and bring the next version to life.")}</span></div>
          {isOwner && <button className={styles.settingsButton} type="button" onClick={() => setSettingsOpen(true)}><UiText text={"⚙ Project settings"} /></button>}
        </header>

        <nav className={styles.tabs}>{TABS.map((tab) => <button key={tab} type="button" onClick={() => router.replace(`/projects/${projectId}?tab=${tab}`, { scroll: false })} className={activeTab === tab ? styles.active : ""}>{_copy(tab[0].toUpperCase() + tab.slice(1))}</button>)}</nav>

        {activeTab === "overview" && <div className={styles.overview}>
          <div className={styles.preview}><div className={styles.previewImage}>{project.coverUrl ? <Image src={project.coverUrl} alt="" fill unoptimized /> : <Image src={filmHero} alt="" fill />}<Link href={project.workId ? `/watch/${project.ownerUid}/${project.workId}` : "/uploader/upload"} aria-label={_copy("Open work")}>▶</Link><span><UiText text={"Latest project version"} /></span></div></div>
          <aside className={styles.quickActions}><Link className={styles.upload} href={project.workId ? `/uploader/works/${project.workId}/edit` : "/uploader/upload"}><UiText text={"↥ Upload version"} /></Link><button type="button" onClick={() => void requestReview()}><UiText text={"▤ Request review"} /></button><Link href={project.workId ? `/uploader/works/${project.workId}/edit` : "/uploader/works"}><UiText text={"↗ Publish work"} /></Link>{project.roomId && <Link href={`/messages/rooms/${project.roomId}`}><UiText text={"⌁ Open project chat"} /></Link>}</aside>
          <div className={styles.statGrid}>
            <article><p><UiText text={"PROJECT MEMBERS"} /></p><strong>{project.members.length}</strong><div className={styles.avatars}>{project.members.slice(0,4).map((member) => <ProfileAvatar key={member.uid} displayName={member.displayName} avatarUrl={member.avatarUrl} className={styles.miniAvatar} />)}</div><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=members`)}><UiText text={"Manage members →"} /></button></article>
            <article><p><UiText text={"MILESTONES"} /></p><strong>{completedMilestones} / {project.milestones.length}</strong><div className={styles.progress}><i style={{ width: `${project.milestones.length ? completedMilestones / project.milestones.length * 100 : 0}%` }} /></div><small>{nextMilestone ? _copy("Next: {title}", { title: nextMilestone.title }) : _copy("No milestones scheduled")}</small><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=milestones`)}><UiText text={"View milestones →"} /></button></article>
            <article><p><UiText text={"FILES"} /></p><strong>{project.workId ? 1 : 0}</strong><small><UiText text={"Versions, project assets and supporting files."} /></small><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=files`)}><UiText text={"View files →"} /></button></article>
            <article><p><UiText text={"CREDITS"} /></p><strong>{project.members.length > 1 ? _copy("In progress") : _copy("Pending")}</strong><small>{project.members.length > 1 ? _copy("{count} roles recorded", { count: project.members.length }) : _copy("Invite collaborators to confirm roles")}</small><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=credits`)}><UiText text={"Review credits →"} /></button></article>
          </div>
          {message && <p className={styles.notice}>{_copy(message)}</p>}
        </div>}

        {activeTab === "members" && <Panel title={_copy("Project members")} intro={_copy("Everyone currently able to enter this workspace.")}><div className={styles.memberList}>{project.members.map((member) => <article key={member.uid}><ProfileAvatar displayName={member.displayName} avatarUrl={member.avatarUrl} className={styles.memberAvatar} /><div><h3>{member.displayName}</h3><p>{member.role}{member.handle ? ` · @${member.handle}` : ""}</p></div>{member.handle && <Link href={`/people/${member.handle}`}><UiText text={"View profile ↗"} /></Link>}</article>)}</div><Link className={styles.panelAction} href="/society?tab=discover"><UiText text={"Find a collaborator →"} /></Link></Panel>}
        {activeTab === "milestones" && <Panel title={_copy("Milestones")} intro={_copy("Keep the production moving without turning the workspace into a dashboard.")}><div className={styles.milestones}>{project.milestones.map((item) => <label key={item.id}><input type="checkbox" checked={item.complete} disabled={!isOwner} onChange={() => void toggleMilestone(item.id)} /><span className={item.complete ? styles.done : ""}>{item.title}</span></label>)}{project.milestones.length === 0 && <p><UiText text={"No milestones yet."} /></p>}</div>{isOwner && <div className={styles.addRow}><input value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder={_copy("Add a milestone")} /><button type="button" disabled={!milestoneTitle.trim()} onClick={() => void addMilestone()}><UiText text={"Add"} /></button></div>}</Panel>}
        {activeTab === "files" && <Panel title={_copy("Project files")} intro={_copy("Versions and supporting files stay attached to the work.")}><div className={styles.fileRow}><span>▧</span><div><h3>{project.workId ? _copy("Connected OONA work") : _copy("No work connected yet")}</h3><p>{project.workId ? _copy("Open the work studio to manage video versions and artwork.") : _copy("Upload the first version to begin.")}</p></div><Link href={project.workId ? `/uploader/works/${project.workId}/edit` : "/uploader/upload"}>{project.workId ? _copy("Open studio") : _copy("Upload")} →</Link></div></Panel>}
        {activeTab === "credits" && <Panel title={_copy("Credits")} intro={_copy("Roles from the invitation remain visible to the whole team.")}><div className={styles.creditList}>{project.members.map((member) => <p key={member.uid}><span>{member.displayName}</span><b>{member.role}</b></p>)}</div>{project.workId && isOwner && <Link className={styles.panelAction} href={`/uploader/works/${project.workId}/edit`}><UiText text={"Edit official work credits →"} /></Link>}</Panel>}
        {activeTab === "activity" && <Panel title={_copy("Activity")} intro={_copy("A quiet record of the project’s important changes.")}><div className={styles.activity}><p><i />{" "}<UiText text={"Project workspace created"} /></p>{project.members.slice(1).map((member) => <p key={member.uid}><i /> {_copy("{name} joined the project", { name: member.displayName })}</p>)}{project.workId && <p><i />{" "}<UiText text={"A work was connected to this project"} /></p>}</div></Panel>}
      </section>

      {settingsOpen && <ProjectSettings project={project} onClose={() => setSettingsOpen(false)} onSave={async (patch) => { const ok = await savePatch(patch); if (ok) setSettingsOpen(false); }} />}
    </main>
  );
}

function Panel({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <section className={styles.panel}><header><p><UiText text={"PROJECT WORKSPACE"} /></p><h2>{title}</h2><span>{intro}</span></header>{children}</section>;
}

function ProjectSettings({ project, onClose, onSave }: { project: ProjectDetail; onClose: () => void; onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const _copy = useUiCopy();
  const [title, setTitle] = useState(project.title); const [description, setDescription] = useState(project.description || ""); const [status, setStatus] = useState(project.status); const [busy, setBusy] = useState(false);
  return <div className={styles.settingsBackdrop}><button type="button" onClick={onClose} aria-label={_copy("Close")} /><form onSubmit={(event) => { event.preventDefault(); setBusy(true); void onSave({ title, description, status }).finally(() => setBusy(false)); }}><header><h2><UiText text={"Project settings"} /></h2><button type="button" onClick={onClose}>×</button></header><label><UiText text={"PROJECT TITLE"} /><input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label><UiText text={"DESCRIPTION"} /><textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label><UiText text={"STATUS"} /><select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}><option value="development"><UiText text={"Development"} /></option><option value="in_production"><UiText text={"In Production"} /></option><option value="post_production"><UiText text={"Post Production"} /></option><option value="complete"><UiText text={"Complete"} /></option></select></label><footer><button type="button" onClick={onClose}><UiText text={"Cancel"} /></button><button disabled={busy || !title.trim()}>{busy ? _copy("Saving…") : _copy("Save changes")}</button></footer></form></div>;
}
