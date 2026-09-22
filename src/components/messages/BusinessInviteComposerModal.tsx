"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { useAuth } from "@/context/AuthContext";
import { uploadBusinessInviteAttachment, validateBusinessInviteAttachmentFile } from "@/lib/business-invites/attachmentUpload";
import type { ProjectListItem } from "@/types/project";
import styles from "./InviteProjectModal.module.css";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

type PersonHit = { uid: string; handle: string; displayName: string; avatarUrl?: string | null };
export type PresetRecipient = { uid: string; handle: string; displayName: string; avatarUrl?: string | null };
type Props = { presetRecipient?: PresetRecipient; onClose: () => void; onSent?: () => void };

export default function BusinessInviteComposerModal({ presetRecipient, onClose, onSent }: Props) {
  const _copy = useUiCopy();
  const { user } = useAuth();
  const [recipient, setRecipient] = useState<PresetRecipient | null>(presetRecipient ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonHit[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [role, setRole] = useState("Creative collaborator");
  const [permissions, setPermissions] = useState<"view_comment" | "edit" | "manage">("view_comment");
  const [availabilityStart, setAvailabilityStart] = useState("");
  const [availabilityEnd, setAvailabilityEnd] = useState("");
  const [location, setLocation] = useState("Remote");
  const [compensation, setCompensation] = useState<"paid" | "unpaid" | "credit" | "negotiable">("negotiable");
  const [budgetRange, setBudgetRange] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    if (!user) throw new Error("login_required");
    const token = await user.getIdToken();
    return fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
  }, [user]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    const response = await authFetch("/api/me/projects");
    if (!response.ok) return;
    const data = await response.json() as { projects?: ProjectListItem[] };
    const next = data.projects ?? [];
    setProjects(next);
    setProjectId((current) => current || next[0]?.id || "");
  }, [authFetch, user]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  const search = useCallback(async (value: string) => {
    if (!user || value.trim().length < 1) { setResults([]); return; }
    const response = await authFetch(`/api/discover/people?q=${encodeURIComponent(value.trim())}`);
    if (!response.ok) return setResults([]);
    const data = await response.json() as { people?: PersonHit[] };
    setResults((data.people ?? []).filter((person) => person.uid !== user.uid).slice(0, 8));
  }, [authFetch, user]);

  useEffect(() => {
    if (recipient) return;
    const timeout = window.setTimeout(() => void search(query), 250);
    return () => window.clearTimeout(timeout);
  }, [query, recipient, search]);

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects]);

  const createNewProject = async () => {
    if (!newProjectTitle.trim()) return;
    setCreating(true); setErr(null);
    try {
      const response = await authFetch("/api/me/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newProjectTitle.trim() }) });
      const data = await response.json() as { project?: ProjectListItem; message?: string };
      if (!response.ok || !data.project) { setErr(data.message || "The project could not be created."); return; }
      setProjects((current) => [data.project!, ...current]);
      setProjectId(data.project.id); setNewProjectOpen(false); setNewProjectTitle("");
    } catch { setErr("The project could not be created."); } finally { setCreating(false); }
  };

  const submit = async () => {
    if (!user || !recipient || !projectId || sending) return;
    setSending(true); setErr(null);
    try {
      let attachment: { attachmentUrl: string; attachmentFileName: string; attachmentContentType: string } | null = null;
      if (file) attachment = await uploadBusinessInviteAttachment(user.uid, crypto.randomUUID(), file);
      const response = await authFetch("/api/me/business-invites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUid: recipient.uid, direction: "offer", projectId, projectTitle: selectedProject?.title, role, permissions, availability: [availabilityStart, availabilityEnd].filter(Boolean).join(" → "), location, compensation, budgetRange, message: message.trim() || undefined, attachmentUrl: attachment?.attachmentUrl, attachmentFileName: attachment?.attachmentFileName, attachmentContentType: attachment?.attachmentContentType }),
      });
      const data = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) { setErr(data.message || "The invitation could not be sent."); return; }
      onSent?.(); onClose();
    } catch { setErr("The invitation could not be sent."); } finally { setSending(false); }
  };

  const chooseFile = (next: File | null) => {
    if (next && validateBusinessInviteAttachmentFile(next)) { setErr("Attach a PDF, document, or image smaller than 15 MB."); return; }
    setFile(next); setErr(null);
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <button className={styles.scrim} type="button" aria-label={_copy("Close invite")} onClick={onClose} />
      <section className={styles.modal}>
        <header className={styles.header}><div><p><UiText text={"OONA SOCIETY"} /></p><h2 id="invite-title"><UiText text={"Invite to project"} /></h2></div><button type="button" onClick={onClose} aria-label={_copy("Close")}>×</button></header>
        <div className={styles.content}>
          {!recipient ? <div className={styles.recipientSearch}><label><UiText text={"CREATOR"} /></label><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={_copy("Search by name or handle")} />{results.length > 0 && <div className={styles.searchResults}>{results.map((person) => <button key={person.uid} type="button" onClick={() => setRecipient(person)}><ProfileAvatar displayName={person.displayName} avatarUrl={person.avatarUrl} className={styles.smallAvatar} /><span><strong>{person.displayName}</strong><small>@{person.handle}</small></span></button>)}</div>}</div> : <div className={styles.recipientCard}><ProfileAvatar displayName={recipient.displayName} avatarUrl={recipient.avatarUrl} className={styles.avatar} /><div><h3>{recipient.displayName}</h3><p>@{recipient.handle}{" "}<UiText text={"· Invited collaborator"} /></p></div><Link href={`/people/${recipient.handle}`}><UiText text={"View profile ↗"} /></Link></div>}
          <div className={styles.projectRow}><label className={styles.field}><span><UiText text={"PROJECT"} /></span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value=""><UiText text={"Select a project"} /></option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><button className={styles.newProjectButton} type="button" onClick={() => setNewProjectOpen((open) => !open)}><UiText text={"＋ Create new project"} /></button></div>
          {newProjectOpen && <div className={styles.newProject}><input value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} placeholder={_copy("New project title")} /><button type="button" disabled={creating || !newProjectTitle.trim()} onClick={() => void createNewProject()}>{creating ? _copy("Creating…") : _copy("Create")}</button></div>}
          <div className={styles.twoColumns}>
            <label className={styles.field}><span><UiText text={"ROLE"} /></span><input value={role} onChange={(event) => setRole(event.target.value)} placeholder={_copy("Writer, editor, producer…")} /></label>
            <label className={styles.field}><span><UiText text={"PERMISSIONS"} /></span><select value={permissions} onChange={(event) => setPermissions(event.target.value as typeof permissions)}><option value="view_comment"><UiText text={"View and comment"} /></option><option value="edit"><UiText text={"Edit project"} /></option><option value="manage"><UiText text={"Manage members"} /></option></select></label>
            <div className={styles.field}><span><UiText text={"AVAILABILITY"} /></span><div className={styles.dateRange}><input type="date" value={availabilityStart} onChange={(event) => setAvailabilityStart(event.target.value)} /><b>→</b><input type="date" value={availabilityEnd} onChange={(event) => setAvailabilityEnd(event.target.value)} /></div></div>
            <label className={styles.field}><span><UiText text={"LOCATION"} /></span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={_copy("Remote or city")} /></label>
            <label className={styles.field}><span><UiText text={"COMPENSATION"} /></span><select value={compensation} onChange={(event) => setCompensation(event.target.value as typeof compensation)}><option value="negotiable"><UiText text={"Negotiable"} /></option><option value="paid"><UiText text={"Paid"} /></option><option value="credit"><UiText text={"Credit"} /></option><option value="unpaid"><UiText text={"Unpaid"} /></option></select></label>
            <label className={styles.field}><span><UiText text={"BUDGET RANGE (OPTIONAL)"} /></span><input value={budgetRange} onChange={(event) => setBudgetRange(event.target.value)} placeholder={_copy("e.g. $2,000 – $5,000 USD")} /></label>
          </div>
          <label className={styles.field}><span><UiText text={"PERSONAL NOTE"} /></span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={5} placeholder={_copy("Introduce the project and explain why you would like to work together.")} /><small>{message.length} / 500</small></label>
          <label className={styles.attachment}><span><UiText text={"SUPPORTING FILE (OPTIONAL)"} /></span><input type="file" accept="application/pdf,.pdf,.doc,.docx,image/*" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />{file && <b>{file.name}</b>}</label>
          {err && <p className={styles.error}>{err}</p>}
        </div>
        <footer className={styles.footer}><button type="button" onClick={onClose}><UiText text={"Cancel"} /></button><button type="button" className={styles.primary} disabled={!recipient || !projectId || sending} onClick={() => void submit()}>{sending ? _copy("Sending…") : _copy("Send invite")}</button></footer>
      </section>
    </div>
  );
}
