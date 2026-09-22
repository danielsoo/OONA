"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import SocietyCreatorRow from "@/components/society/SocietyCreatorRow";
import SocietySelfProfileSection from "@/components/society/SocietySelfProfileSection";
import {
  MOCK_INTEREST_TAGS,
  MOCK_SCHOOLS,
  SOCIETY_SORT_OPTIONS,
  mockSchoolForUid,
  mockTagsForPerson,
  type SocietySortId,
} from "@/lib/societyMockData";
import { useSocietyPresencePoll } from "@/hooks/useSocietyPresencePoll";
import {
  addFollowingUid,
  loadFollowingUids,
  loadSocietyPeople,
  readFollowingUids,
  readSocietyPeople,
} from "@/lib/societyPeopleCache";
import type { SocietyPerson } from "@/lib/societyTypes";
import type { ProfileRoleTag } from "@/types/portfolio";
import { buttonClass } from "@/components/ui/Button";
import { useUiCopy } from "@/components/i18n/UiText";

export type SocietyTabId = "discover" | "connections" | "requests" | "sent" | "works";

const ROLE_OPTIONS: { value: "" | ProfileRoleTag; labelKey: string }[] = [
  { value: "", labelKey: "society.filterAllRoles" },
  { value: "director", labelKey: "network.field.director" },
  { value: "actor", labelKey: "network.field.actor" },
  { value: "crew", labelKey: "network.field.crew" },
];

function DropdownSelect({
  label,
  value,
  onChange,
  options,
  labelClassName = "relative shrink-0",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  labelClassName?: string;
}) {
  return (
    <label className={labelClassName}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none border-0 bg-transparent px-2 py-2 pr-6 text-center text-sm text-white/55 focus:outline-none focus:ring-0"
      >
        {options.map((opt) => (
          <option key={opt.value || "all"} value={opt.value} className="bg-xiio-card text-white">
            {opt.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-white/40"
        aria-hidden
      >
        ▾
      </span>
    </label>
  );
}

type Props = {
  activeTab: SocietyTabId;
  onTabChange: (tab: SocietyTabId) => void;
  hideTabs?: boolean;
};

export default function SocietyConnectionsPanel({ activeTab, onTabChange, hideTabs = false }: Props) {
  const _copy = useUiCopy();
  const { user } = useAuth();
  const { t } = useTranslations();
  const tab = activeTab;
  const [role, setRole] = useState<"" | ProfileRoleTag>("");
  const [school, setSchool] = useState("");
  const [interest, setInterest] = useState("");
  const [sort, setSort] = useState<SocietySortId>("recent");
  const [q, setQ] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Keep the first server and client render identical. Cached browser data is
  // restored by the effects below after hydration.
  const [people, setPeople] = useState<SocietyPerson[]>([]);
  const [connectedUids, setConnectedUids] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(tab === "discover");
  const [err, setErr] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const loadFollowingSet = useCallback(async () => {
    if (!user) {
      setConnectedUids(new Set());
      return;
    }
    const stored = readFollowingUids(user.uid);
    if (stored) setConnectedUids(new Set(stored));
    try {
      const uids = await loadFollowingUids(user);
      setConnectedUids(new Set(uids));
    } catch {
      /* ignore */
    }
  }, [user]);

  const load = useCallback(async () => {
    if (tab === "requests" || tab === "sent" || tab === "works") {
      setLoading(false);
      setPeople([]);
      setErr(null);
      return;
    }
    if (tab === "connections" && !user) {
      setLoading(false);
      setPeople([]);
      setErr(null);
      return;
    }

    const options = {
      followingOnly: tab === "connections",
      role,
      q: searchQuery,
    } as const;
    const stored = readSocietyPeople(user, options);
    if (stored) {
      setPeople(stored.people);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setErr(null);
    try {
      const data = await loadSocietyPeople(user, options);
      setPeople(data.people);
    } catch {
      setErr(t("society.loadError"));
      if (!stored) setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [user, tab, role, searchQuery, t]);

  const submitSearch = () => {
    setSearchQuery(q.trim());
  };

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFollowingSet();
  }, [loadFollowingSet]);

  const filteredPeople = useMemo(() => {
    let list = [...people];
    if (school) {
      list = list.filter((p) => mockSchoolForUid(p.uid) === school);
    }
    if (interest) {
      list = list.filter((p) => mockTagsForPerson(p.uid, p.roleTags, p.headline).includes(interest));
    }
    if (sort === "name") {
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else if (sort === "recent") {
      list.sort((a, b) => {
        const aMs = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
        const bMs = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
        const aTime = Number.isNaN(aMs) ? 0 : aMs;
        const bTime = Number.isNaN(bMs) ? 0 : bMs;
        return bTime - aTime;
      });
    }
    return list;
  }, [people, school, interest, sort]);

  const presenceUids = useMemo(() => filteredPeople.map((p) => p.uid), [filteredPeople]);

  useSocietyPresencePoll({
    user,
    uids: presenceUids,
    setPeople,
    enabled: tab === "discover" || tab === "connections",
  });

  const tabs: { id: SocietyTabId; labelKey: string }[] = [
    { id: "discover", labelKey: "society.tabDiscover" },
    { id: "connections", labelKey: "society.tabConnections" },
    { id: "requests", labelKey: "society.tabRequests" },
    { id: "sent", labelKey: "society.tabSent" },
    { id: "works", labelKey: "society.tabWorks" },
  ];

  const handleConnect = async (person: SocietyPerson) => {
    if (!user) return;
    setBusyUid(person.uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/me/follows/${person.uid}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const next = addFollowingUid(user.uid, person.uid);
        setConnectedUids(new Set(next));
      }
    } finally {
      setBusyUid(null);
    }
  };

  const schoolOptions = useMemo(
    () => [
      { value: "", label: t("society.filterAllSchools") },
      ...MOCK_SCHOOLS.map((s) => ({ value: s, label: s })),
    ],
    [t]
  );

  const interestOptions = useMemo(
    () => [
      { value: "", label: t("society.filterAllInterests") },
      ...MOCK_INTEREST_TAGS.map((tag) => ({ value: tag, label: tag })),
    ],
    [t]
  );

  const sortOptions = SOCIETY_SORT_OPTIONS.map((o) => ({
    value: o.id,
    label: t(o.labelKey),
  }));

  const roleOptions = ROLE_OPTIONS.map((o) => ({
    value: o.value,
    label: t(o.labelKey),
  }));

  const emptyMessage =
    tab === "requests"
      ? t("society.emptyRequests")
      : tab === "sent"
        ? t("society.emptySent")
        : t("society.empty");

  return (
    <div className="min-w-0 flex-1">
      {!hideTabs ? <nav className="scrollbar-none flex gap-7 overflow-x-auto border-b border-line" aria-label={_copy("Connections tabs")}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`relative shrink-0 pb-3 text-body font-medium transition-colors ${
              tab === item.id ? "text-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t(item.labelKey)}
            {tab === item.id ? (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-ink"
                aria-hidden
              />
            ) : null}
          </button>
        ))}
      </nav> : null}

      {tab !== "requests" && tab !== "sent" && tab !== "works" ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder={t("discover.searchPlaceholder")}
              className="h-10 min-w-[200px] flex-1 rounded-full border border-line bg-white/[0.04] px-4 text-small text-ink placeholder:text-ink-4 focus:border-xiio-accent/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={submitSearch}
              className={buttonClass({ variant: "secondary", size: "md" })}
            >
              {t("discover.search")}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
          <DropdownSelect
            label={t("society.filterAllRoles")}
            value={role}
            onChange={(v) => setRole(v as "" | ProfileRoleTag)}
            options={roleOptions}
            labelClassName="relative min-w-[120px] shrink-0"
          />
          <DropdownSelect
            label={t("society.filterAllSchools")}
            value={school}
            onChange={setSchool}
            options={schoolOptions}
            labelClassName="relative min-w-[120px] shrink-0"
          />
          <DropdownSelect
            label={t("society.filterAllInterests")}
            value={interest}
            onChange={setInterest}
            options={interestOptions}
            labelClassName="relative min-w-[120px] shrink-0"
          />
          <div className="ml-auto w-full sm:w-auto">
            <DropdownSelect
              label={t("society.sortRecent")}
              value={sort}
              onChange={(v) => setSort(v as SocietySortId)}
              options={sortOptions}
            />
          </div>
          </div>
        </>
      ) : null}

      {tab === "works" ? (
        <div className="mt-6">
          {!user ? (
            <p className="text-sm text-white/50">
              {t("society.loginRequired")}{" "}
              <Link href="/login" className="text-xiio-accent hover:underline">
                {t("common.login")}
              </Link>
            </p>
          ) : (
            <SocietySelfProfileSection />
          )}
        </div>
      ) : (
        <div className="mt-6 divide-y divide-white/10">
          {!user && tab !== "requests" && tab !== "sent" ? (
            <p className="text-sm text-white/50">
              {t("society.loginRequired")}{" "}
              <Link href="/login" className="text-xiio-accent hover:underline">
                {t("common.login")}
              </Link>
            </p>
          ) : null}

          {loading ? <p className="text-sm text-white/45">{t("common.loading")}</p> : null}
          {err ? <p className="text-sm text-red-400">{err}</p> : null}

          {!loading && !err && filteredPeople.length === 0 ? (
            <p className="text-sm text-white/45">{emptyMessage}</p>
          ) : null}

          {!loading &&
            filteredPeople.map((person) => (
              <SocietyCreatorRow
                key={person.uid}
                person={person}
                connected={tab === "connections" || connectedUids.has(person.uid)}
                connectBusy={busyUid === person.uid}
                onConnect={() => void handleConnect(person)}
              />
            ))}
        </div>
      )}
    </div>
  );
}
