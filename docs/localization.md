# OONA language guidelines

Supported interface languages: English (`en`), 한국어 (`ko`), 日本語 (`ja`).

## Voice and terminology

Use concise, familiar service language, not word-for-word translations. Korean guidance uses polite `-세요` / `-습니다`; Japanese guidance uses `です` / `ます`. Marketing headlines may be shorter and more conversational. Translate whole sentences with placeholders rather than assembling English word order from fragments.

| Context | English | 한국어 | 日本語 |
| --- | --- | --- | --- |
| Film category | Films | 영화 | 映画 |
| Entertainment category | Shows | 예능 | バラエティ |
| Short video category | Shorts | 쇼츠 | ショート |
| Community | Society | 커뮤니티 | コミュニティ |
| Viewing shelf | Continue Watching | 시청 중인 작품 | 視聴中の作品 |
| Playback action | Resume watching | 이어서 보기 | 続きを再生 |
| Saved works | My List | 내가 찜한 작품 | マイリスト |
| Work contributors | Cast and crew | 출연진·제작진 | キャスト・スタッフ |
| Upload action | Upload a work | 작품 업로드 | 作品をアップロード |

Reference terminology checked against official service help pages:

- [YouTube Japanese help](https://support.google.com/youtube/?hl=ja): 動画をアップロード, 再生リスト, ショート動画.
- [YouTube Korean help](https://support.google.com/youtube/answer/2398242?co=GENIE.Platform%3DDesktop&hl=ko): 업로드, 재생목록, 나중에 볼 동영상.
- [Netflix Korean viewing shelf](https://help.netflix.com/ko/node/115312): 시청 중인 콘텐츠.
- [Netflix Japanese terminology](https://help.netflix.com/ja/node/321880164349028): 視聴中コンテンツ, マイリスト.

OONA uses 작품 / 作品 for the film portfolio context. Titles, names, biographies, messages, submitted descriptions, and other user-authored material remain in their original language. Do not automatically translate them by passing them through the UI catalog. Technical identifiers, URLs, provider names, and currency values are not localized as prose.

## Implementation

- `src/i18n/messages.ts`: existing keyed English/Korean catalog; editorial overrides in `copy.ts`; Japanese in `ja.ts`.
- `src/i18n/ui-messages.ts`: additional application copy for the cinematic screens. Each entry contains Korean and Japanese, with the English source at call sites.
- `src/i18n/source-keys.ts`: reuse map for existing keyed messages. Prefer an explicit keyed message for context-sensitive labels.
- `UiText` returns a text node; it does not insert a wrapper or change layout.
- `useUiCopy` handles string props and complete interpolated UI sentences. Use explicit singular/plural source phrases for English counts.
- Header and login provide a native language selector. Settings and sign-up also list all three languages.
- The browser preference is persisted to `xiio_locale`. With no saved preference, use a supported browser language, otherwise English. A profile preference is used on sign-in only when there is no saved device preference. Manual selection is not overwritten by profile refreshes.
- Existing server rendering starts in English; the saved preference is applied on hydration. This is client-side localization, not locale-specific SEO routing.

## Verification

Run `node scripts/check-localization.cjs` for key parity, interpolation-variable parity, static UI coverage and storage behavior. The audit covers registered static strings, not arbitrary runtime/API messages or untranslated user content.

Verified locally: English/Korean/Japanese switching, saved Japanese preference after reload, home and login, and desktop/mobile menu spacing. Account-only actions and actual invitation email delivery were not exercised. Existing repository-wide TypeScript test errors (missing Vitest, `.ts` test import configuration and an incomplete invitation test fixture) are separate from localization.

Application TypeScript passes with those existing test fixtures excluded. The repository does not yet have an ESLint configuration; `next lint` prompts for setup, so lint was not certified and no lint configuration was changed as part of this work.

The `localize-*.cjs` scripts are one-time mechanical migration tools, not runtime dependencies. Keep new UI copy in the catalogs and use the checker when adding it. Human language review remains appropriate before a public multilingual launch; automated coverage checks cannot certify native-speaker fluency.
