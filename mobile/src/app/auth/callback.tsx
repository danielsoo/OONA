import { router, useLocalSearchParams } from "expo-router";
import { signInWithCustomToken } from "firebase/auth";
import { useEffect, useState } from "react";
import { Loading, Message } from "~/components/ui";
import { auth } from "~/lib/firebase";
import { useLocale } from "~/lib/locale";

/**
 * oona://auth/callback: normally caught by the in-app browser session in
 * signInWithSocialWeb. If the system opens it as a link instead (some Android
 * browsers), finish the Kakao/Naver sign-in here.
 */
export default function AuthCallbackScreen() {
  const { token, error } = useLocalSearchParams<{ token?: string; error?: string }>();
  const { t } = useLocale();
  const [failed, setFailed] = useState(Boolean(error));

  useEffect(() => {
    if (!token || !auth) return;
    signInWithCustomToken(auth, token)
      .then(() => router.replace("/"))
      .catch(() => setFailed(true));
  }, [token]);

  if (failed || !token) return <Message title={t("auth.login.errorLoginFailedDetail", { detail: error ?? "" })} />;
  return <Loading />;
}
