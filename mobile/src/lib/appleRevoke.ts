import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { firebaseConfig } from "~/lib/config";
import { auth } from "~/lib/firebase";

/**
 * App Store guideline 5.1.1(v): deleting an account created with Sign in with
 * Apple must also revoke the Apple token. Apple hands the app a fresh
 * authorization code, and Firebase's revokeToken endpoint accepts it
 * (tokenType CODE; the JS SDK's revokeAccessToken only sends ACCESS_TOKEN,
 * which a native sign-in never receives).
 *
 * Returns false when the user is not an Apple user or cancelled the sheet.
 */
export async function revokeAppleTokenIfNeeded(): Promise<boolean> {
  const user = auth?.currentUser;
  if (!user || Platform.OS !== "ios") return false;
  if (!user.providerData.some((p) => p.providerId === "apple.com")) return false;

  const result = await AppleAuthentication.signInAsync({ requestedScopes: [] });
  if (!result.authorizationCode) return false;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v2/accounts:revokeToken?key=${encodeURIComponent(firebaseConfig.apiKey ?? "")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: "apple.com",
        tokenType: "CODE",
        token: result.authorizationCode,
        idToken: await user.getIdToken(),
      }),
    }
  );
  if (!res.ok) throw new Error(`apple_revoke_failed_${res.status}`);
  return true;
}
