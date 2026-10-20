import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, OAuthProvider, Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

/** Named Firestore DB (Console에 "xiio" 등). 비우면 (default) */
const firestoreDatabaseId =
  process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID?.trim() || undefined;

/**
 * Local emulators (firebase emulators:start --only auth,firestore), e.g. to
 * try the demo site's seeded world on this machine: set to the emulators'
 * host (127.0.0.1). Unset everywhere else.
 */
const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST?.trim() || undefined;

if (firebaseConfig.apiKey) {
  const fresh = getApps().length === 0;
  app = fresh ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  storage = getStorage(app);
  if (emulatorHost && fresh) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
  }
}

export { auth, db, storage };
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");
