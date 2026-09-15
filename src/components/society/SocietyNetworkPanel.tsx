"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BusinessInviteComposerModal, {
  type PresetRecipient,
} from "@/components/messages/BusinessInviteComposerModal";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import SocietySelfProfileSection from "@/components/society/SocietySelfProfileSection";
import { useAuth } from "@/context/AuthContext";
import {
  MOCK_INTEREST_TAGS,
  MOCK_SCHOOLS,
  mockSchoolForUid,
  mockTagsForPerson,
  primaryRoleLabelKey,
} from "@/lib/societyMockData";
import { loadFollowingUids, loadSocietyPeople } from "@/lib/societyPeopleCache";
import type { SocietyPerson } from "@/lib/societyTypes";
import type { BusinessInviteListItem } from "@/types/business-invite";
import type { ProfileRoleTag } from "@/types/portfolio";
import discoverHero from "../../../discover_hero.webp";
import filmHero from "../../../film_hero.webp";
import styles from "./SocietyNetworkPanel.module.css";

export type SocietyTabId = "discover" | "connections" | "requests" | "sent" | "works";

type Props = {
  activeTab: SocietyTabId;
  onTabChange: (tab: SocietyTabId) => void;
};

const TABS: { id: SocietyTabId; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "connections", label: "My Connections" },
  { id: "requests", label: "Requests" },
  { id: "sent", label: "Sent" },
  { id: "works", label: "My Works" },
];

const FALLBACK_IMAGES: StaticImageData[] = [discoverHero, filmHero, discoverHero, filmHero];

function roleLabel(person: SocietyPerson): string {
  const key = primaryRoleLabelKey(person.roleTags);
  if (key === "network.field.director") return "Director";
  if (key === "network.field.actor") return "Actor";
  return "Creative crew";
}

function inviteDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusLabel(status: BusinessInviteListItem["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function EditorialAvatar({ person, className }: { person: SocietyPerson; className: string }) {
  return (
    <ProfileAvatar
      displayName={person.displayName}
      avatarUrl={person.avatarUrl}
      className={className}
      imgClassName="h-full w-full object-cover grayscale-[12%]"
    />
  );
}

function PersonCard({
  person,
  index,
  selected,
  connected,
  busy,
  onSelect,
  onConnect,
}: {
  person: SocietyPerson;
  index: number;
  selected: boolean;
  connected: boolean;
  busy: boolean;
  onSelect: () => void;
  onConnect: () => void;
}) {
  const tags = mockTagsForPerson(person.uid, person.roleTags, person.headline);
  const school = mockSchoolForUid(person.uid);

  return (
    <article className={`${styles.personCard} ${selected ? styles.selectedCard : ""}`}>
      <button type="button" className={styles.cardPortrait} onClick={onSelect} aria-label={`View ${person.displayName}`}>
        {person.avatarUrl ? (
          <EditorialAvatar person={person} className={styles.cardAvatar} />
        ) : (
          <Image src={FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]!} alt="" fill priority={index === 0} sizes="(max-width: 760px) 80vw, 280px" />
        )}
        <span className={styles.portraitShade} aria-hidden="true" />
        {person.openToCollaborate ? <span className={styles.availableMark}>Available</span> : null}
      </button>
      <div className={styles.cardBody}>
        <button type="button" onClick={onSelect} className={styles.personName}>{person.displayName}</button>
        <p>{roleLabel(person)} <span>·</span> {school}</p>
        <div className={styles.tags}>{tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <button type="button" className={styles.cardConnect} disabled={busy} onClick={onConnect}>
          {busy ? "Working…" : connected ? "Connected" : "Connect"}
          <span aria-hidden="true">{connected ? "✓" : "+"}</span>
        </button>
      </div>
    </article>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyRule} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export default function SocietyNetworkPanel({ activeTab, onTabChange }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [people, setPeople] = useState<SocietyPerson[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [invites, setInvites] = useState<BusinessInviteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"" | ProfileRoleTag>("");
  const [school, setSchool] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [inviteRecipient, setInviteRecipient] = useState<PresetRecipient | null>(null);

  const requireUser = useCallback(() => {
    if (user) return true;
    router.push(`/login?returnTo=${encodeURIComponent(`/society?tab=${activeTab}`)}`);
    return false;
  }, [activeTab, router, user]);

  const loadPeople = useCallback(async () => {
    const followingOnly = activeTab === "connections";
    if (followingOnly && !user) {
      setPeople([]);
      setFollowing(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await loadSocietyPeople(user, { followingOnly });
      setPeople(result.people);
      setSelectedUid((current) => current && result.people.some((person) => person.uid === current) ? current : result.people[0]?.uid ?? null);
      if (user) setFollowing(new Set(await loadFollowingUids(user)));
    } catch {
      setError("We couldn’t load the creator directory. Please try again.");
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  const loadInvites = useCallback(async () => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const box = activeTab === "sent" ? "sent" : "received";
      const response = await fetch(`/api/me/business-invites?box=${box}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as { invites?: BusinessInviteListItem[] };
      setInvites(data.invites ?? []);
    } catch {
      setError("We couldn’t load your invitations. Please try again.");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === "discover" || activeTab === "connections") void loadPeople();
    else if (activeTab === "requests" || activeTab === "sent") void loadInvites();
    else setLoading(false);
  }, [activeTab, loadInvites, loadPeople]);

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return people.filter((person) => {
      const tags = mockTagsForPerson(person.uid, person.roleTags, person.headline);
      if (needle && !`${person.displayName} ${person.handle} ${person.headline ?? ""} ${mockSchoolForUid(person.uid)}`.toLowerCase().includes(needle)) return false;
      if (role && !person.roleTags.includes(role)) return false;
      if (school && mockSchoolForUid(person.uid) !== school) return false;
      if (discipline && !tags.includes(discipline)) return false;
      if (availableOnly && !person.openToCollaborate) return false;
      return true;
    });
  }, [availableOnly, discipline, people, query, role, school]);

  const selected = filteredPeople.find((person) => person.uid === selectedUid) ?? filteredPeople[0] ?? null;

  const toggleConnection = async (person: SocietyPerson) => {
    if (!requireUser() || !user) return;
    setBusyId(person.uid);
    try {
      const connected = following.has(person.uid);
      const token = await user.getIdToken();
      const response = await fetch(`/api/me/follows/${person.uid}`, {
        method: connected ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      setFollowing((current) => {
        const next = new Set(current);
        if (connected) next.delete(person.uid);
        else next.add(person.uid);
        return next;
      });
      if (connected && activeTab === "connections") setPeople((current) => current.filter((item) => item.uid !== person.uid));
    } finally {
      setBusyId(null);
    }
  };

  const startMessage = async (uid: string) => {
    if (!requireUser() || !user) return;
    setBusyId(uid);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/me/dm/threads", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targetUid: uid }),
      });
      const data = (await response.json()) as { threadId?: string };
      if (response.ok && data.threadId) router.push(`/messages/${data.threadId}`);
    } finally {
      setBusyId(null);
    }
  };

  const openInvite = (person: SocietyPerson | BusinessInviteListItem) => {
    if (!requireUser()) return;
    if ("uid" in person) {
      setInviteRecipient({ uid: person.uid, handle: person.handle, displayName: person.displayName, avatarUrl: person.avatarUrl });
    } else {
      setInviteRecipient({ uid: person.otherUid, handle: person.otherHandle ?? "", displayName: person.otherDisplayName, avatarUrl: person.otherAvatarUrl });
    }
  };

  const changeInvite = async (invite: BusinessInviteListItem, action: "accept" | "decline" | "cancel") => {
    if (!user) return;
    setBusyId(invite.id);
    setError(null);
    try {
      const token = await user.getIdToken();
      const url = action === "cancel"
        ? `/api/me/business-invites/${invite.id}`
        : `/api/me/business-invites/${invite.id}/${action}`;
      const response = await fetch(url, {
        method: action === "cancel" ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json()) as { threadId?: string; projectId?: string; message?: string };
      if (!response.ok) {
        setError(data.message ?? "That action could not be completed.");
        return;
      }
      await loadInvites();
      if (action === "accept" && data.projectId) router.push(`/projects/${data.projectId}`);
      else if (action === "accept" && data.threadId) router.push(`/messages/${data.threadId}`);
    } finally {
      setBusyId(null);
    }
  };

  const availableConnections = filteredPeople.filter((person) => person.openToCollaborate);
  const otherConnections = filteredPeople.filter((person) => !person.openToCollaborate);

  return (
    <section className={styles.shell}>
      <header className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>OONA SOCIETY</p>
          <h1>The people behind<br />the work.</h1>
        </div>
        <p className={styles.introCopy}>Meet student filmmakers, artists, and collaborators.<br />Build the team for what comes next.</p>
      </header>

      <nav className={styles.tabs} aria-label="Society sections">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={activeTab === tab.id ? styles.activeTab : ""}>
            {tab.label}
            {(tab.id === "requests" && invites.filter((invite) => invite.status === "pending").length > 0 && activeTab === "requests") ? (
              <span className={styles.count}>{invites.filter((invite) => invite.status === "pending").length}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {(activeTab === "discover" || activeTab === "connections") ? (
        <>
          <div className={styles.toolbar}>
            <label className={styles.searchField}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search creators, schools, or disciplines" />
            </label>
            <label><span className="sr-only">Role</span><select value={role} onChange={(event) => setRole(event.target.value as "" | ProfileRoleTag)}><option value="">All roles</option><option value="director">Directors</option><option value="actor">Actors</option><option value="crew">Creative crew</option></select></label>
            <label><span className="sr-only">School</span><select value={school} onChange={(event) => setSchool(event.target.value)}><option value="">All schools</option>{MOCK_SCHOOLS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className="sr-only">Discipline</span><select value={discipline} onChange={(event) => setDiscipline(event.target.value)}><option value="">All disciplines</option>{MOCK_INTEREST_TAGS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className={styles.availability}><input type="checkbox" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} /><span aria-hidden="true" /> Available now</label>
          </div>

          {activeTab === "discover" ? (
            <div className={styles.discoverLayout}>
              <div className={styles.resultsColumn}>
                <div className={styles.sectionHeading}><div><p>CURATED FOR YOU</p><h2>Discover creators</h2></div><span>{filteredPeople.length} people</span></div>
                {loading ? <div className={styles.loading}>Finding creators…</div> : error ? <EmptyState title="Directory unavailable" body={error} /> : filteredPeople.length === 0 ? <EmptyState title="No matches yet" body="Try a broader search or remove one of the filters." /> : (
                  <div className={styles.creatorGrid}>
                    {filteredPeople.map((person, index) => <PersonCard key={person.uid} person={person} index={index} selected={selected?.uid === person.uid} connected={following.has(person.uid)} busy={busyId === person.uid} onSelect={() => setSelectedUid(person.uid)} onConnect={() => void toggleConnection(person)} />)}
                  </div>
                )}
              </div>
              {selected ? (
                <aside className={styles.profileDrawer}>
                  <div className={styles.drawerPortrait}>
                    {selected.avatarUrl ? <EditorialAvatar person={selected} className={styles.drawerAvatar} /> : <Image src={discoverHero} alt="" fill priority sizes="340px" />}
                    <span className={styles.drawerShade} />
                  </div>
                  <div className={styles.drawerBody}>
                    <p className={styles.drawerKicker}>{selected.openToCollaborate ? "OPEN TO COLLABORATE" : "CREATOR PROFILE"}</p>
                    <h2>{selected.displayName}</h2>
                    <p className={styles.drawerMeta}>{roleLabel(selected)} <span>·</span> {mockSchoolForUid(selected.uid)}</p>
                    <p className={styles.drawerBio}>{selected.bio || selected.headline || "Student creator interested in thoughtful work and new collaborations."}</p>
                    <div className={styles.tags}>{mockTagsForPerson(selected.uid, selected.roleTags, selected.headline).map((tag) => <span key={tag}>{tag}</span>)}</div>
                    <div className={styles.drawerActions}>
                      <Link href={`/people/${selected.handle}`}>View profile <span>↗</span></Link>
                      <button type="button" disabled={busyId === selected.uid} onClick={() => void startMessage(selected.uid)}>Message</button>
                      <button type="button" onClick={() => openInvite(selected)}>Invite to project</button>
                    </div>
                  </div>
                </aside>
              ) : null}
            </div>
          ) : (
            <ConnectionsView people={filteredPeople} available={availableConnections} others={otherConnections} loading={loading} error={error} busyId={busyId} onMessage={startMessage} onInvite={openInvite} onRemove={toggleConnection} requireUser={requireUser} />
          )}
        </>
      ) : activeTab === "requests" || activeTab === "sent" ? (
        <InvitesView tab={activeTab} invites={invites} loading={loading} error={error} busyId={busyId} loggedIn={Boolean(user)} onChange={changeInvite} onMessage={startMessage} onInvite={openInvite} onLogin={requireUser} />
      ) : (
        <div className={styles.worksView}>
          <div className={styles.sectionHeading}><div><p>YOUR PORTFOLIO</p><h2>Selected works</h2></div><Link href="/account?tab=profile">Edit profile <span>↗</span></Link></div>
          {!user ? <EmptyState title="Your work belongs here" body="Sign in to curate the projects collaborators see first." action={<button type="button" className={styles.primaryButton} onClick={requireUser}>Sign in</button>} /> : <SocietySelfProfileSection />}
        </div>
      )}

      {inviteRecipient ? <BusinessInviteComposerModal presetRecipient={inviteRecipient} onClose={() => setInviteRecipient(null)} onSent={() => { setInviteRecipient(null); onTabChange("sent"); }} /> : null}
    </section>
  );
}

function ConnectionsView({
  people,
  available,
  others,
  loading,
  error,
  busyId,
  onMessage,
  onInvite,
  onRemove,
  requireUser,
}: {
  people: SocietyPerson[];
  available: SocietyPerson[];
  others: SocietyPerson[];
  loading: boolean;
  error: string | null;
  busyId: string | null;
  onMessage: (uid: string) => Promise<void>;
  onInvite: (person: SocietyPerson) => void;
  onRemove: (person: SocietyPerson) => Promise<void>;
  requireUser: () => boolean;
}) {
  if (loading) return <div className={styles.loading}>Loading your connections…</div>;
  if (error) return <EmptyState title="Connections unavailable" body={error} />;
  if (people.length === 0) return <EmptyState title="Your circle starts here" body="Follow creators in Discover and they’ll appear here for quick collaboration." action={<button className={styles.primaryButton} type="button" onClick={requireUser}>Sign in to connect</button>} />;

  const renderRows = (rows: SocietyPerson[]) => rows.map((person) => (
    <article className={styles.connectionRow} key={person.uid}>
      <Link href={`/people/${person.handle}`} className={styles.connectionIdentity}>
        <EditorialAvatar person={person} className={styles.rowAvatar} />
        <span><strong>{person.displayName}</strong><small>{roleLabel(person)} <b>·</b> {mockSchoolForUid(person.uid)}</small></span>
      </Link>
      <div className={styles.connectionInterests}>{mockTagsForPerson(person.uid, person.roleTags, person.headline).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <p className={styles.connectionStatus}>{person.openToCollaborate ? "Available for a new project" : "In your creative circle"}</p>
      <div className={styles.rowActions}><button disabled={busyId === person.uid} type="button" onClick={() => void onMessage(person.uid)}>Message</button><button type="button" onClick={() => onInvite(person)}>Invite</button><button className={styles.moreButton} disabled={busyId === person.uid} type="button" title="Remove connection" onClick={() => void onRemove(person)}>×</button></div>
    </article>
  ));

  return (
    <div className={styles.connectionsView}>
      <div className={styles.sectionHeading}><div><p>YOUR CREATIVE CIRCLE</p><h2>My connections</h2></div><span>{people.length} connections</span></div>
      {available.length ? <section className={styles.connectionGroup}><header><h3>Available now</h3><span>{available.length}</span></header>{renderRows(available)}</section> : null}
      {others.length ? <section className={styles.connectionGroup}><header><h3>Your connections</h3><span>{others.length}</span></header>{renderRows(others)}</section> : null}
    </div>
  );
}

function InvitesView({
  tab,
  invites,
  loading,
  error,
  busyId,
  loggedIn,
  onChange,
  onMessage,
  onInvite,
  onLogin,
}: {
  tab: "requests" | "sent";
  invites: BusinessInviteListItem[];
  loading: boolean;
  error: string | null;
  busyId: string | null;
  loggedIn: boolean;
  onChange: (invite: BusinessInviteListItem, action: "accept" | "decline" | "cancel") => Promise<void>;
  onMessage: (uid: string) => Promise<void>;
  onInvite: (invite: BusinessInviteListItem) => void;
  onLogin: () => boolean;
}) {
  const received = tab === "requests";
  return (
    <div className={styles.invitesView}>
      <div className={styles.sectionHeading}>
        <div><p>{received ? "COLLABORATION INBOX" : "OUTGOING"}</p><h2>{received ? "Requests" : "Sent invitations"}</h2></div>
        <span>{invites.filter((invite) => invite.status === "pending").length} pending</span>
      </div>
      {!loggedIn ? <EmptyState title="Sign in to see invitations" body="Project invitations and collaboration requests are private to your account." action={<button className={styles.primaryButton} type="button" onClick={onLogin}>Sign in</button>} /> : loading ? <div className={styles.loading}>Loading invitations…</div> : error ? <EmptyState title="Invitations unavailable" body={error} /> : invites.length === 0 ? <EmptyState title={received ? "No requests right now" : "Nothing sent yet"} body={received ? "New collaboration proposals will appear here." : "Invite a creator from Discover to start a project conversation."} /> : (
        <div className={styles.inviteList}>
          {invites.map((invite) => (
            <article className={styles.inviteRow} key={invite.id}>
              <ProfileAvatar displayName={invite.otherDisplayName} avatarUrl={invite.otherAvatarUrl} className={styles.inviteAvatar} imgClassName="h-full w-full object-cover" />
              <div className={styles.inviteMain}>
                <div className={styles.inviteTop}><div><h3>{invite.otherDisplayName}</h3><p>{invite.projectTitle || (invite.direction === "offer" ? "Project invitation" : "Collaboration application")} {invite.role ? <><span>·</span> {invite.role}</> : null} <span>·</span> {inviteDate(invite.createdAt)}</p></div><span className={`${styles.status} ${styles[`status_${invite.status}`]}`}>{statusLabel(invite.status)}</span></div>
                {invite.message ? <blockquote>“{invite.message}”</blockquote> : <blockquote>{received ? "They would like to discuss working together." : "You invited this creator to collaborate."}</blockquote>}
                {invite.attachmentUrl ? <a className={styles.attachment} href={invite.attachmentUrl} target="_blank" rel="noreferrer">Attachment · {invite.attachmentFileName || "View file"} ↗</a> : null}
              </div>
              <div className={styles.inviteActions}>
                {received && invite.status === "pending" ? <><button className={styles.primaryButton} disabled={busyId === invite.id} type="button" onClick={() => void onChange(invite, "accept")}>Accept</button><button disabled={busyId === invite.id} type="button" onClick={() => void onChange(invite, "decline")}>Decline</button></> : null}
                {!received && invite.status === "pending" ? <button disabled={busyId === invite.id} type="button" onClick={() => void onChange(invite, "cancel")}>Cancel request</button> : null}
                {invite.status === "accepted" ? <button disabled={busyId === invite.otherUid} type="button" onClick={() => void onMessage(invite.otherUid)}>Message</button> : null}
                {invite.status === "accepted" && invite.projectId ? <Link href={`/projects/${invite.projectId}`}>Open project <span>↗</span></Link> : null}
                {!received && (invite.status === "declined" || invite.status === "expired" || invite.status === "cancelled") ? <button type="button" onClick={() => onInvite(invite)}>Invite again</button> : null}
                {invite.otherHandle ? <Link href={`/people/${invite.otherHandle}`}>View profile <span>↗</span></Link> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
