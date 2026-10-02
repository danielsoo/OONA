import { SignInPrompt } from "~/components/SignInPrompt";
import { Message } from "~/components/ui";
import { appText } from "~/lib/appCopy";
import { useAuth } from "~/lib/auth";
import { useLocale } from "~/lib/locale";

/**
 * Upload is phase 2 of the app (docs/mobile-app-plan.md): pick video and
 * thumbnail, tag credits, then the same API sequence as the website's
 * UploaderUploadForm (stream upload URL → staging → tus → submit for review).
 */
export default function UploadScreen() {
  const { user } = useAuth();
  const { locale } = useLocale();

  if (!user) return <SignInPrompt />;
  return <Message title={appText(locale, "uploadComingTitle")} body={appText(locale, "uploadComingBody")} />;
}
