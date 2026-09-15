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

const TABS = ["overview", "members", "milestones", "files", "credits", "activity"] as const;
type Tab = typeof TABS[number];

function statusLabel(status: ProjectStatus) {
  return status === "in_production" ? "In Production" : status === "post_production" ? "Post Production" : status === "complete" ? "Complete" : "Development";
}

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
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

  if (loading || authLoading) return <main className={styles.state}>Opening project…</main>;
  if (error || !project) return <main className={styles.state}><h1>Project unavailable</h1><p>{error}</p><Link href="/society?tab=works">Return to Society</Link></main>;
  const isOwner = project.ownerUid === user?.uid;

  return (
    <main className={styles.page}>
      <div className={styles.kicker}><span>03</span> PROJECT WORKSPACE <small>Plan. Create. Share.</small></div>
      <section className={styles.workspace}>
        <header className={styles.projectHeader}>
          <div className={styles.cover}>{project.coverUrl ? <Image src={project.coverUrl} alt="" fill unoptimized /> : <Image src={filmHero} alt="" fill />}</div>
          <div className={styles.identity}><p>{project.category || "OONA PROJECT"} <b>·</b> <i /> {statusLabel(project.status)}</p><h1>{project.title}</h1><span>{project.description || "A shared place for your team to shape the work, exchange feedback, and bring the next version to life."}</span></div>
          {isOwner && <button className={styles.settingsButton} type="button" onClick={() => setSettingsOpen(true)}>⚙ Project settings</button>}
        </header>

        <nav className={styles.tabs}>{TABS.map((tab) => <button key={tab} type="button" onClick={() => router.replace(`/projects/${projectId}?tab=${tab}`, { scroll: false })} className={activeTab === tab ? styles.active : ""}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</nav>

        {activeTab === "overview" && <div className={styles.overview}>
          <div className={styles.preview}><div className={styles.previewImage}>{project.coverUrl ? <Image src={project.coverUrl} alt="" fill unoptimized /> : <Image src={filmHero} alt="" fill />}<Link href={project.workId ? `/watch/${project.ownerUid}/${project.workId}` : "/uploader/upload"} aria-label="Open work">▶</Link><span>Latest project version</span></div></div>
          <aside className={styles.quickActions}><Link className={styles.upload} href={project.workId ? `/uploader/works/${project.workId}/edit` : "/uploader/upload"}>↥ Upload version</Link><button type="button" onClick={() => void requestReview()}>▤ Request review</button><Link href={project.workId ? `/uploader/works/${project.workId}/edit` : "/uploader/works"}>↗ Publish work</Link>{project.roomId && <Link href={`/messages/rooms/${project.roomId}`}>⌁ Open project chat</Link>}</aside>
          <div className={styles.statGrid}>
            <article><p>PROJECT MEMBERS</p><strong>{project.members.length}</strong><div className={styles.avatars}>{project.members.slice(0,4).map((member) => <ProfileAvatar key={member.uid} displayName={member.displayName} avatarUrl={member.avatarUrl} className={styles.miniAvatar} />)}</div><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=members`)}>Manage members →</button></article>
            <article><p>MILESTONES</p><strong>{completedMilestones} / {project.milestones.length}</strong><div className={styles.progress}><i style={{ width: `${project.milestones.length ? completedMilestones / project.milestones.length * 100 : 0}%` }} /></div><small>{nextMilestone ? `Next: ${nextMilestone.title}` : "No milestones scheduled"}</small><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=milestones`)}>View milestones →</button></article>
            <article><p>FILES</p><strong>{project.workId ? 1 : 0}</strong><small>Versions, project assets and supporting files.</small><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=files`)}>View files →</button></article>
            <article><p>CREDITS</p><strong>{project.members.length > 1 ? "In progress" : "Pending"}</strong><small>{project.members.length > 1 ? `${project.members.length} roles recorded` : "Invite collaborators to confirm roles"}</small><button type="button" onClick={() => router.replace(`/projects/${projectId}?tab=credits`)}>Review credits →</button></article>
          </div>
          {message && <p className={styles.notice}>{message}</p>}
        </div>}

        {activeTab === "members" && <Panel title="Project members" intro="Everyone currently able to enter this workspace."><div className={styles.memberList}>{project.members.map((member) => <article key={member.uid}><ProfileAvatar displayName={member.displayName} avatarUrl={member.avatarUrl} className={styles.memberAvatar} /><div><h3>{member.displayName}</h3><p>{member.role}{member.handle ? ` · @${member.handle}` : ""}</p></div>{member.handle && <Link href={`/people/${member.handle}`}>View profile ↗</Link>}</article>)}</div><Link className={styles.panelAction} href="/society?tab=discover">Find a collaborator →</Link></Panel>}
        {activeTab === "milestones" && <Panel title="Milestones" intro="Keep the production moving without turning the workspace into a dashboard."><div className={styles.milestones}>{project.milestones.map((item) => <label key={item.id}><input type="checkbox" checked={item.complete} disabled={!isOwner} onChange={() => void toggleMilestone(item.id)} /><span className={item.complete ? styles.done : ""}>{item.title}</span></label>)}{project.milestones.length === 0 && <p>No milestones yet.</p>}</div>{isOwner && <div className={styles.addRow}><input value={milestoneTitle} onChange={(event) => setMilestoneTitle(event.target.value)} placeholder="Add a milestone" /><button type="button" disabled={!milestoneTitle.trim()} onClick={() => void addMilestone()}>Add</button></div>}</Panel>}
        {activeTab === "files" && <Panel title="Project files" intro="Versions and supporting files stay attached to the work."><div className={styles.fileRow}><span>▧</span><div><h3>{project.workId ? "Connected OONA work" : "No work connected yet"}</h3><p>{project.workId ? "Open the work studio to manage video versions and artwork." : "Upload the first version to begin."}</p></div><Link href={project.workId ? `/uploader/works/${project.workId}/edit` : "/uploader/upload"}>{project.workId ? "Open studio" : "Upload"} →</Link></div></Panel>}
        {activeTab === "credits" && <Panel title="Credits" intro="Roles from the invitation remain visible to the whole team."><div className={styles.creditList}>{project.members.map((member) => <p key={member.uid}><span>{member.displayName}</span><b>{member.role}</b></p>)}</div>{project.workId && isOwner && <Link className={styles.panelAction} href={`/uploader/works/${project.workId}/edit`}>Edit official work credits →</Link>}</Panel>}
        {activeTab === "activity" && <Panel title="Activity" intro="A quiet record of the project’s important changes."><div className={styles.activity}><p><i /> Project workspace created</p>{project.members.slice(1).map((member) => <p key={member.uid}><i /> {member.displayName} joined the project</p>)}{project.workId && <p><i /> A work was connected to this project</p>}</div></Panel>}
      </section>

      {settingsOpen && <ProjectSettings project={project} onClose={() => setSettingsOpen(false)} onSave={async (patch) => { const ok = await savePatch(patch); if (ok) setSettingsOpen(false); }} />}
    </main>
  );
}

function Panel({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <section className={styles.panel}><header><p>PROJECT WORKSPACE</p><h2>{title}</h2><span>{intro}</span></header>{children}</section>;
}

function ProjectSettings({ project, onClose, onSave }: { project: ProjectDetail; onClose: () => void; onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState(project.title); const [description, setDescription] = useState(project.description || ""); const [status, setStatus] = useState(project.status); const [busy, setBusy] = useState(false);
  return <div className={styles.settingsBackdrop}><button type="button" onClick={onClose} aria-label="Close" /><form onSubmit={(event) => { event.preventDefault(); setBusy(true); void onSave({ title, description, status }).finally(() => setBusy(false)); }}><header><h2>Project settings</h2><button type="button" onClick={onClose}>×</button></header><label>PROJECT TITLE<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>DESCRIPTION<textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>STATUS<select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}><option value="development">Development</option><option value="in_production">In Production</option><option value="post_production">Post Production</option><option value="complete">Complete</option></select></label><footer><button type="button" onClick={onClose}>Cancel</button><button disabled={busy || !title.trim()}>{busy ? "Saving…" : "Save changes"}</button></footer></form></div>;
}
