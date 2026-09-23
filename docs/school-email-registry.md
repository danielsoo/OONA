# School email registry — initial US / Korea / Japan release

The application uses **Firestore**, not MongoDB. This release provides a small, curated allowlist for the existing `schools` collection. No database migration is needed. The JSON is a deployment input, **not a live fallback**: school verification still requires an active Firestore school document with reviewed `emailDomains`.

## Scope and sources

`data/school-email-domains.json` contains 24 institutions (8 per country), 34 exact domains, search aliases, official university source URLs and a review date of **2026-09-22**. It is a starter set, not coverage of all universities or every departmental mailbox in these countries.

| Country | Initial institutions |
| --- | --- |
| US | Penn State, NYU, USC, UCLA, Stanford, Boston University, UC Berkeley, Ohio State |
| Korea | 서울대, 연세대, 고려대, KAIST, 한양대, 성균관대, 중앙대, 한국예술종합학교 |
| Japan | 東京大学, 京都大学, 早稲田大学, 慶應義塾大学, 日本大学, 大阪大学, 筑波大学, 立命館大学 |

Each record links to the institution's instructions, rather than deriving email addresses from its homepage URL. Examples:

- [Ohio State's August 2026 change](https://it.osu.edu/news/2026/08/19/students-now-have-one-email-account-lastnameosuedu): both `osu.edu` and `buckeyemail.osu.edu` receive student mail.
- [Tsukuba's current student email instructions](https://www.u.tsukuba.ac.jp/email/): current `u.tsukuba.ac.jp` plus legacy `s.tsukuba.ac.jp` for earlier cohorts.
- [Nihon University](https://www.nihon-u.ac.jp/information/20250704-3748.html): `g.nihon-u.ac.jp` for students, not the staff domain.
- [Waseda's 2026 student setup guide](https://www.waseda.jp/inst/cjl/assets/uploads/2026/03/03-1_How-to-set-up-MyWaseda_En.pdf): seven specific student-selectable subdomains; no wildcard.

Known alumni-only addresses (`alumni.kaist.ac.kr`, `kyoto-u.jp`) are excluded. **Some supported addresses are retained by alumni or are shared with staff. Email verification does not prove current enrollment.** Keep the current-enrollment declaration, expected graduation month, expiry and abuse-review policy described in `school-email-verification.md`. Ordinary uploads without a school remain available.

## Validate without credentials

```powershell
npm run schools:validate
npm run test:school-registry
```

These commands are entirely offline and never send email or write to Firestore.

## Import into the intended Firestore database

1. Configure Firebase Admin credentials locally: either `FIREBASE_SERVICE_ACCOUNT_JSON` in ignored `.env.local`, or Application Default Credentials (for example, a `GOOGLE_APPLICATION_CREDENTIALS` file outside the repository). Never paste private keys into chat or commit them.
2. Find the **actual project ID and database ID** in the Firebase console. The importer intentionally requires both arguments; it does not assume that production uses the suggested `xiio` database. Use `"(default)"` explicitly if that is the actual database ID. `.env.local` is loaded for credentials, but the command-line arguments determine the target. A service-account project mismatch is rejected. If `FIRESTORE_EMULATOR_HOST` is set, the printed target identifies the emulator instead of production.
3. Preview using the correct values in place of the placeholders:

```powershell
npm run schools:import -- --project YOUR_PROJECT_ID --database YOUR_DATABASE_ID
```

4. Review the full school IDs and changed fields in the dry run. Only then apply:

```powershell
npm run schools:import -- --project YOUR_PROJECT_ID --database YOUR_DATABASE_ID --apply
```

5. Repeat the dry run; unchanged records should report `unchanged`. Separately configure the mail provider and verification secret, then test delivery to an authorized student mailbox. This import never sends verification emails or creates user verification records.

## Safety and reconciliation

- Reads existing schools first. Reuses IDs when the **full name** matches a curated name; does not reassign existing works or rename schools.
- Existing school names, slugs, counts, logos, colors, coordinates and creation dates are preserved. Missing schools receive conservative defaults and no invented coordinates.
- Adds `emailDomains`, `countryCode`, multilingual `aliases`, `emailDomainRegistry` provenance, and activates the reviewed school. Existing valid admin-reviewed domains and aliases are preserved.
- Does not infer an institution from an acronym, email suffix or user-supplied alias. An existing abbreviated name can trigger a possible-duplicate error; an administrator must establish the full institution identity before rerunning.
- Duplicate schools, domain ownership conflicts, mismatched countries, merged records, unknown statuses or unsafe pre-existing domains abort **all** writes. Resolve these through a deliberate administrative review; the importer never deletes/merges records automatically.
- Replans inside one Firestore transaction, using `create` for new records and `update` only for changed metadata. Repeated imports are idempotent; unchanged documents are not timestamp-touched.
- No school records or domain lists are writable by public suggestion endpoints. Search aliases are for display/search only, never used as proof of school membership.
- The catalog scan fails closed above 5,000 existing records; review limits before expanding the registry. The initial list is tiny, but operations still follow the project's normal Firestore billing and permissions.

## Adding and removing domains

Add institutions only after checking official student email instructions, retaining source URLs and updating the review date. `matchNames` contains unambiguous institution names; abbreviations and localized search labels belong in `aliases`. Use exact student domains and explicitly list each supported subdomain. Never add a generic country suffix or consumer mail provider.

This importer is additive to protect existing administrative configuration. **Removing an entry from the JSON does not revoke an existing Firestore domain.** To revoke a domain, review and remove it directly from the school's Firestore `emailDomains` in a separate authorized operation. Existing membership eligibility is checked against the current database domains on each school upload.

## Import verification — 2026-09-22

The initial registry was applied to project `xiio-9d86b`, database `xiio`, after a conflict-free dry run. One existing school (Penn State) received reviewed metadata and 23 schools were created. A second dry run reported all 24 records unchanged. No users, works or school memberships were edited by this import.

Local development uses an independently generated `SCHOOL_VERIFICATION_SECRET` in ignored `.env.development.local`; the copied `.env.local` was preserved. Production must receive its own server-only secret through deployment environment configuration before the verification feature is enabled there.

Delivery is **not ready** with the current local sender configuration. The Resend key cannot list domains (`restricted_api_key`), and a single idempotent test to Resend's delivery simulator was rejected with HTTP 403 because the configured sender uses unverified `gmail.com`. No real student received an email. Configure an address on a domain you own and have verified in Resend; do not attempt to verify Gmail or switch to an onboarding sender. After that, recheck simulator acceptance and actual inbox delivery with an authorized school recipient.
