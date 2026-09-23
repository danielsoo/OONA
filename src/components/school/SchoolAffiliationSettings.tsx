"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import SchoolPicker, { type SchoolPickerValue } from "@/components/uploader/SchoolPicker";
import SchoolEmailVerification from "./SchoolEmailVerification";
import type { SchoolVerificationStatus } from "@/lib/school-verification";

export default function SchoolAffiliationSettings({ initialSchoolName }: { initialSchoolName?: string }) {
  const { user } = useAuth();
  const { t } = useTranslations();
  const [school, setSchool] = useState<SchoolPickerValue>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setSchool(null); setError(false);
    if (!user) { setLoading(false); return; }
    void user.getIdToken().then(token => fetch("/api/me/school-verification", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }))
      .then(async res => { if (!res.ok) throw Error(); return res.json() as Promise<SchoolVerificationStatus>; })
      .then(data => { if (!cancelled && data.schoolId && data.schoolName) setSchool({ id: data.schoolId, name: data.schoolName }); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);
  return <section className="border-t border-white/10 pt-6">
    <h2 className="mb-2 text-lg text-white">{t("schoolVerification.title")}</h2>
    <p className="mb-4 text-sm text-white/60">{t("schoolVerification.profileHint")}</p>
    {loading ? <p role="status">{t("schoolVerification.checking")}</p> : <>
      <SchoolPicker value={school} onChange={setSchool} user={user} initialQuery={initialSchoolName} />
      {school && user ? <SchoolEmailVerification key={`${user.uid}:${school.id}`} schoolId={school.id} /> : null}
      {error ? <p className="mt-2 text-sm text-amber-200" role="alert">{t("schoolVerification.school_mail_unavailable")}</p> : null}
    </>}
  </section>;
}
