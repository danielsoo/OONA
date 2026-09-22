"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import UiText from "@/components/i18n/UiText";
import { useUiCopy } from "@/components/i18n/UiText";

type Item = {
  id: string; reporterUid: string; reporterEmail: string | null; reporterName: string;
  category: string; message: string; area: string | null; pagePath: string;
  createdAt: string | null; adminNote: string | null;
};

export default function AdminUploaderFeedbackReview() {
  const _copy = useUiCopy();
  const { locale } = useTranslations();
  const { user } = useAuth();
  const [queue, setQueue] = useState<"pending" | "resolved">("pending");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/uploader-feedback?queue=${queue}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json() as { items?: Item[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? `HTTP ${response.status}`);
      setItems(body.items ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [queue, user]);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (id: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    const response = await fetch(`/api/admin/uploader-feedback/${id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: notes[id] ?? "" }),
    });
    if (!response.ok) { setError(`Could not resolve feedback (HTTP ${response.status}).`); return; }
    await load();
  };

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {(["pending", "resolved"] as const).map((value) => <button key={value} type="button" onClick={() => setQueue(value)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${queue === value ? "bg-xiio-accent text-white" : "border border-white/10 bg-white/5 text-xiio-muted hover:text-white"}`}>{value === "pending" ? _copy("Pending") : _copy("Resolved")}</button>)}
      </div>
      {loading ? <p className="text-sm text-xiio-muted"><UiText text={"Loading…"} /></p> : null}
      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}
      {!loading && items.length === 0 ? <p className="text-sm text-xiio-muted"><UiText text={"No feedback in this queue."} /></p> : null}
      <ul className="space-y-4">
        {items.map((item) => {
          const mail = item.reporterEmail ? `mailto:${item.reporterEmail}?subject=${encodeURIComponent(`XIIO feedback ${item.id}`)}` : null;
          return <li key={item.id} className="rounded-2xl border border-white/10 bg-xiio-surface p-5">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-xiio-accent/80">{item.category.replaceAll("_", " ")} · {item.area ?? "Uploader"}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{item.message}</p></div><span className="text-xs text-white/30">#{item.id}</span></div>
            <div className="mt-4 grid gap-2 text-xs text-white/40 sm:grid-cols-2"><p><UiText text={"From:"} />{" "}<Link className="text-xiio-accent hover:underline" href={`/admin/users/${item.reporterUid}`}>{item.reporterName}</Link></p><p><UiText text={"Time:"} />{" "}{item.createdAt ? new Date(item.createdAt).toLocaleString(locale) : "—"}</p><p className="break-all sm:col-span-2"><UiText text={"Page:"} />{" "}{item.pagePath || "—"}</p></div>
            {mail ? <a href={mail} className="mt-4 inline-flex h-9 items-center rounded-full border border-xiio-accent/40 px-4 text-xs font-semibold text-xiio-accent hover:bg-xiio-accent/10"><UiText text={"Contact user"} /></a> : null}
            {queue === "pending" ? <div className="mt-4 border-t border-white/[0.07] pt-4"><textarea rows={2} value={notes[item.id] ?? ""} onChange={(e) => setNotes((current) => ({ ...current, [item.id]: e.target.value }))} placeholder={_copy("Internal resolution note")} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" /><button type="button" onClick={() => void resolve(item.id)} className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-xs font-semibold text-black"><UiText text={"Mark resolved"} /></button></div> : item.adminNote ? <p className="mt-4 text-sm text-white/50"><UiText text={"Admin note:"} />{" "}{item.adminNote}</p> : null}
          </li>;
        })}
      </ul>
    </div>
  );
}
