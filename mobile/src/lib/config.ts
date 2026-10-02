/** Values bundled from EXPO_PUBLIC_* variables (see .env.example). */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://xiio.vercel.app").replace(/\/$/, "");

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firestoreDatabaseId = process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID?.trim() || undefined;

export const googleSignInConfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  /** The native module is only linked when the iOS URL scheme was set at build time. */
  enabled: Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME),
};
