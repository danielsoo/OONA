# School email verification

## Product policy

- General uploads remain available with no school selected. Existing authentication/profile/deposit policies are unchanged.
- Only works submitted to a school's page require school email verification.
- One current school membership per account. Reuse it for uploads through the **end of the self-reported graduation month (UTC)**, rather than sending a code for every work.
- The user confirms current enrollment and enters an expected graduation month. Re-verification is required to extend/change that date or change schools.
- This is **email ownership verification, not proof of enrollment**. Alumni may retain email access and users may misreport dates. Do not label it “verified student.”
- When the expected graduation month passes, or the user says they are no longer enrolled, new school uploads are blocked. General uploads and already-published works remain available; do not retroactively erase school history.
- Additional checks are reserved for reports/suspected misuse. No student certificates are collected in this implementation.

## Required deployment configuration

1. Working Firebase Admin credentials and the intended Firestore database.
2. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for a **verified sending domain**. The Resend onboarding sender is intentionally rejected; it cannot serve arbitrary school recipients. Uses the existing Resend REST integration: https://resend.com/docs/api-reference/emails/send-email
3. `SCHOOL_VERIFICATION_SECRET`: independently generated secret, at least 32 characters, server-only. Never commit it or expose it as `NEXT_PUBLIC_*`.
4. In each reviewed `schools/{schoolId}` document, set `status: "active"` and `emailDomains: ["official-school-domain.example"]` after verifying the university's official email instructions. The example is a placeholder, not a live allowlist. List student subdomains individually. Do not add public mailbox services, broad suffixes such as `edu`/`ac.kr`, alumni-only domains, wildcards, or domains merely supplied by uploaders.
5. The normal school self-registration endpoint intentionally ignores `emailDomains`. A suggested/pending school cannot authenticate until an administrator reviews it. Unsupported schools do not block general uploads.
6. Optional Firestore TTL policy on `schoolVerificationEmailLimits.expiresAt` to remove hashed rate-limit records after 48 hours. These records contain no plaintext email or UID.

A curated initial US/KR/JP domain list and safe Firestore importer are available in [school-email-registry.md](school-email-registry.md). The checked-in list does not grant eligibility until imported into the intended database. No live credentials, database records or email sends are provisioned by the code change. Deploying without these settings fails closed for school uploads, while general uploads continue.

## Private data and lifecycle

`users/{uid}/private/schoolVerification` contains the email, self-reported enrollment/graduation month, server verification timestamp, current challenge, and per-account rate limits. Existing Firestore rules deny client access to this entire private path. Public profile school names are display data only and cannot grant eligibility. Successful verification updates the display name of the school, never exposes the email or graduation month on the public profile, and does not grant an enrollment badge.

Challenges use random 6-digit codes, a per-challenge random ID, HMAC-SHA256 with a server secret, a ten-minute deadline, five attempts, and single-use consumption. Only a successful provider response makes a challenge verifiable. Resending replaces the old challenge. No code or email is returned from the API or logged. Expired challenges are rejected even if still present in storage; they are replaced on the next send and removed on success or withdrawal. Existing account deletion clears the private collection.

Sending is limited transactionally to one request per minute per account and recipient, five per account/day, ten per recipient/day (UTC). Failed delivery counts toward limits to prevent repeated provider abuse. Rotating the secret invalidates pending codes and changes the recipient rate-limit keys; completed verifications remain valid until expiration/revocation.

## Review and recovery

- After investigating a report, an administrator can set `reviewRequired: true` on the private verification document. This blocks verification and school uploads without affecting general uploads. The user cannot clear it by leaving or re-verifying. Clear the flag only after review; use the existing report workflow to communicate with the user.
- Profile → About exposes school email management and “I'm no longer enrolled.”
- Upload → Catalog exposes optional school selection. Clear that selection for a general upload. Codes/email are never stored in upload drafts.
- Server gates apply at work creation, final submission and initial publication, and at submission/approval of a new full-video revision. Editing descriptive metadata on an already-published work does not erase its historical school association.
- Existing **unpublished school-tagged drafts** require verification before submission. If graduation occurs while a work is pending, it cannot be published with a school tag until the affiliation is reviewed/removed by an administrator. Existing published works are not migrated or unlisted.

## Verification

Run `npm run test:school-verification`, `npm run test:i18n`, and `npm run test:society`. The school tests use in-memory transactional storage and a fake mail provider; they never contact Firebase, send email or modify real profiles. Before enabling in production, verify real delivery with an authorized test recipient, and confirm exact-domain matching against the configured institution.
