"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "@/context/LocaleContext";
import SchoolPicker, { type SchoolPickerValue } from "@/components/uploader/SchoolPicker";
import SchoolEmailVerification from "./SchoolEmailVerification";
import type { SchoolVerificationStatus } from "@/lib/school-verification";
import styles from "@/components/settings/SettingsPage.module.css";

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
  return <section className={styles.section}>
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>{t("schoolVerification.title")}</h2>
      <p className={styles.sectionHint}>{t("schoolVerification.profileHint")}</p>
    </div>
    {loading ? <p className={styles.note} role="status">{t("schoolVerification.checking")}</p> : <>
      <SchoolPicker value={school} onChange={setSchool} user={user} initialQuery={initialSchoolName} inputClassName={styles.input} />
      {school && user ? <SchoolEmailVerification key={`${user.uid}:${school.id}`} schoolId={school.id} /> : null}
      {error ? <p className={`${styles.warn} ${styles.avatarNote}`} role="alert">{t("schoolVerification.school_mail_unavailable")}</p> : null}
    </>}
  </section>;
}
