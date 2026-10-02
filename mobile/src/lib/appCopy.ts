import type { Locale } from "@/i18n";

/**
 * App-only strings that the website's dictionaries (src/i18n) do not have yet.
 * Move an entry into src/i18n/messages.ts once the website needs it too.
 */
const appCopy = {
  promoTrimStart: {
    en: "Promo clip start (seconds), up to 120 seconds are used",
    ko: "쇼츠 시작 지점(초), 최대 120초까지 사용돼요",
    ja: "ショートの開始位置（秒）、最大120秒まで使用されます",
  },
  myProfile: { en: "My profile", ko: "내 프로필", ja: "マイプロフィール" },
  language: { en: "Language", ko: "언어", ja: "言語" },
  signOut: { en: "Sign out", ko: "로그아웃", ja: "ログアウト" },
} satisfies Record<string, Record<Locale, string>>;

export type AppCopyKey = keyof typeof appCopy;

export function appText(locale: Locale, key: AppCopyKey): string {
  return appCopy[key][locale];
}
