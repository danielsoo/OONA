import type { Locale } from "@/i18n";

/**
 * App-only strings that the website's dictionaries (src/i18n) do not have yet.
 * Move an entry into src/i18n/messages.ts once the website needs it too.
 */
const appCopy = {
  uploadComingTitle: {
    en: "Uploading from the app is coming next",
    ko: "앱 업로드는 다음 업데이트에서 열려요",
    ja: "アプリからのアップロードは次のアップデートで対応します",
  },
  uploadComingBody: {
    en: "For now, upload on the OONA website. Your work appears here as soon as it is approved.",
    ko: "지금은 웹사이트에서 업로드해 주세요. 승인되면 앱에도 바로 보여요.",
    ja: "現在はウェブサイトからアップロードしてください。承認されるとアプリにも表示されます。",
  },
  myProfile: { en: "My profile", ko: "내 프로필", ja: "マイプロフィール" },
  language: { en: "Language", ko: "언어", ja: "言語" },
  signOut: { en: "Sign out", ko: "로그아웃", ja: "ログアウト" },
} satisfies Record<string, Record<Locale, string>>;

export type AppCopyKey = keyof typeof appCopy;

export function appText(locale: Locale, key: AppCopyKey): string {
  return appCopy[key][locale];
}
