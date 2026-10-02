import {
  type Auth,
  type AuthProvider,
  type UserCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import type { SocialProviderKey } from "@/lib/authProviders";
import { isNativeApp } from "@/lib/native/platform";

/**
 * Google blocks OAuth inside embedded WebViews, and popups do not open in the
 * app, so `signInWithPopup` fails there. In the app we sign in with the native
 * Google / Apple SDK and hand the resulting credential to the same Firebase
 * web SDK the site uses, so the session, conflict handling and profile routing
 * stay identical to the browser.
 */
export async function signInWithSocialProvider(
  auth: Auth,
  provider: SocialProviderKey,
  webProvider: AuthProvider
): Promise<UserCredential> {
  if (!isNativeApp() || (provider !== "google" && provider !== "apple")) {
    return signInWithPopup(auth, webProvider);
  }

  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");

  if (provider === "google") {
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("NATIVE_GOOGLE_SIGN_IN_FAILED");
    return signInWithCredential(
      auth,
      GoogleAuthProvider.credential(idToken, result.credential?.accessToken ?? undefined)
    );
  }

  const result = await FirebaseAuthentication.signInWithApple({
    skipNativeAuth: true,
    scopes: ["email", "name"],
  });
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error("NATIVE_APPLE_SIGN_IN_FAILED");
  const credential = new OAuthProvider("apple.com").credential({
    idToken,
    rawNonce: result.credential?.nonce ?? undefined,
  });
  return signInWithCredential(auth, credential);
}
