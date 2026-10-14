import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { jsonError } from "@/lib/server/api-auth";
import { translate, type Locale } from "@/i18n";
import { emailMatchesSchool, normalizeSchoolEmail, schoolEmailDomains, schoolEligibilityReason, validGraduationMonth, validSchoolId, SCHOOL_CODE_MAX_ATTEMPTS, SCHOOL_CODE_TTL_MS, SCHOOL_SEND_COOLDOWN_MS, type SchoolEmailMembership, type SchoolVerificationStatus } from "@/lib/school-verification";

export class SchoolVerificationError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
type Challenge = { id: string; schoolId: string; email: string; graduationMonth: string; hash: string; expiresAt: number; attempts: number; delivered: boolean };
type PrivateRecord = { membership?: SchoolEmailMembership; challenge?: Challenge; reviewRequired?: boolean; day?: string; sends?: number; lastSentAt?: number };
const privateRef = (db: Firestore, uid: string) => db.collection("users").doc(uid).collection("private").doc("schoolVerification");
const fail = (code: string, status = 400): never => { throw new SchoolVerificationError(code, status); };

function secret() {
  const value = process.env.SCHOOL_VERIFICATION_SECRET?.trim();
  if (!value || value.length < 32) return fail("school_mail_unavailable", 503);
  return value;
}
function digest(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
const challengeHash = (uid: string, c: Pick<Challenge, "id" | "schoolId" | "email">, code: string) => digest(JSON.stringify([uid, c.id, c.schoolId, c.email, code]));

async function schoolConfig(db: Firestore, schoolId: string) {
  if (!validSchoolId(schoolId)) return fail("school_unavailable");
  const snap = await db.collection("schools").doc(schoolId).get();
  const data = snap.data();
  const domains = schoolEmailDomains(data?.emailDomains);
  if (!data || data.status !== "active" || !domains.length) return fail("school_unavailable");
  return { name: typeof data.name === "string" ? data.name : schoolId, domains };
}

export async function getSchoolVerificationStatus(db: Firestore, uid: string, requestedSchool?: string): Promise<SchoolVerificationStatus> {
  const data = (await privateRef(db, uid).get()).data() as PrivateRecord | undefined;
  const membership = data?.membership;
  const schoolId = requestedSchool || membership?.schoolId;
  const empty = { eligible: false, reason: "school_verification_required", schoolId: schoolId ?? null, schoolName: null, maskedEmail: null, graduationMonth: null, domains: [] };
  if (!schoolId) return empty;
  let config;
  try { config = await schoolConfig(db, schoolId); }
  catch (error) { if (error instanceof SchoolVerificationError) return { ...empty, reason: error.code }; throw error; }
  const matches = membership?.schoolId === schoolId;
  const reason = schoolEligibilityReason(membership, schoolId, config.domains, data?.reviewRequired === true);
  return {
    eligible: !reason, reason, schoolId, schoolName: config.name, domains: config.domains,
    maskedEmail: matches ? membership.email[0] + "***@" + membership.email.split("@")[1] : null,
    graduationMonth: matches ? membership.graduationMonth : null,
  };
}

/** The public profile's editable school name is deliberately not trusted here. */
export async function requireSchoolUploadEligibility(db: Firestore, uid: string, schoolId?: string | null) {
  if (!schoolId) return null; // General uploads never require school verification.
  const status = await getSchoolVerificationStatus(db, uid, schoolId);
  return status.eligible ? null : jsonError(status.reason!, translate("ko", `schoolVerification.${status.reason}`), 403);
}

export async function sendSchoolCode(db: Firestore, uid: string, input: { schoolId: string; email: unknown; enrolled: unknown; graduationMonth: unknown; locale: Locale }) {
  const config = await schoolConfig(db, input.schoolId);
  const email = normalizeSchoolEmail(input.email);
  if (!email || !emailMatchesSchool(email, config.domains)) return fail("school_email_mismatch");
  if (input.enrolled !== true || !validGraduationMonth(input.graduationMonth)) return fail("school_enrollment_required");
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from || /onboarding@resend\.dev/i.test(from)) return fail("school_mail_unavailable", 503);
  secret();
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const challenge: Challenge = { id: randomUUID(), schoolId: input.schoolId, email, graduationMonth: input.graduationMonth, hash: "", expiresAt: now + SCHOOL_CODE_TTL_MS, attempts: 0, delivered: false };
  challenge.hash = challengeHash(uid, challenge, code);
  const ref = privateRef(db, uid);
  const mailLimitRef = db.collection("schoolVerificationEmailLimits").doc(digest(email));
  await db.runTransaction(async tx => {
    const [snap, mailSnap] = await Promise.all([tx.get(ref), tx.get(mailLimitRef)]);
    const previous = snap.data() as PrivateRecord | undefined;
    const mail = mailSnap.data();
    if (previous?.reviewRequired) return fail("school_review_required", 403);
    const sends = previous?.day === day ? previous.sends ?? 0 : 0;
    const mailSends = mail?.day === day ? Number(mail.sends) || 0 : 0;
    if ((previous?.lastSentAt && now - previous.lastSentAt < SCHOOL_SEND_COOLDOWN_MS) || (mail?.lastSentAt && now - mail.lastSentAt < SCHOOL_SEND_COOLDOWN_MS) || sends >= 5 || mailSends >= 10) return fail("school_rate_limited", 429);
    tx.set(ref, { challenge, day, sends: sends + 1, lastSentAt: now }, { merge: true });
    tx.set(mailLimitRef, { day, sends: mailSends + 1, lastSentAt: now, expiresAt: Timestamp.fromMillis(now + 2 * 86400000) });
  });
  let sent = false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `school-code/${challenge.id}` },
      body: JSON.stringify({ from, to: [email], subject: translate(input.locale, "schoolVerification.emailSubject"), text: translate(input.locale, "schoolVerification.emailBody", { code }) }),
      signal: AbortSignal.timeout(10000),
    });
    sent = response.ok;
  } catch { /* Never log codes, recipient addresses or provider response bodies. */ }
  await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() as PrivateRecord | undefined;
    if (data?.challenge?.id === challenge.id) tx.update(ref, { challenge: sent ? { ...challenge, delivered: true } : FieldValue.delete() });
  });
  if (!sent) return fail("school_mail_unavailable", 503);
  return { sent: true, expiresInSeconds: SCHOOL_CODE_TTL_MS / 1000, retryAfterSeconds: SCHOOL_SEND_COOLDOWN_MS / 1000 };
}

export async function verifySchoolCode(db: Firestore, uid: string, schoolId: string, code: unknown) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return fail("school_code_invalid");
  const config = await schoolConfig(db, schoolId);
  const ref = privateRef(db, uid);
  const result = await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() as PrivateRecord | undefined;
    if (data?.reviewRequired) return "school_review_required";
    const c = data?.challenge;
    if (!c || c.schoolId !== schoolId || !c.delivered || c.expiresAt <= Date.now() || c.attempts >= SCHOOL_CODE_MAX_ATTEMPTS) return "school_code_expired";
    const actual = Buffer.from(challengeHash(uid, c, code), "hex");
    const expected = Buffer.from(c.hash, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      tx.update(ref, { "challenge.attempts": c.attempts + 1 });
      return "school_code_invalid";
    }
    if (!emailMatchesSchool(c.email, config.domains) || !validGraduationMonth(c.graduationMonth)) return "school_enrollment_required";
    tx.set(ref, { membership: { schoolId, schoolName: config.name, email: c.email, graduationMonth: c.graduationMonth, enrolled: true, verifiedAt: Date.now() }, challenge: FieldValue.delete() }, { merge: true });
    // Profile display only; school uploads read the server-only private record.
    tx.set(db.collection("users").doc(uid), { schoolName: config.name }, { merge: true });
    return null;
  });
  if (result) return fail(result, result === "school_review_required" ? 403 : 400);
  return getSchoolVerificationStatus(db, uid, schoolId);
}

export async function leaveSchool(db: Firestore, uid: string) {
  await privateRef(db, uid).set({ membership: FieldValue.delete(), challenge: FieldValue.delete() }, { merge: true });
  // Keep the optional school name on the profile as history, without an eligibility claim.
}
