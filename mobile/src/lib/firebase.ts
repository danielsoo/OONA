import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, firestoreDatabaseId } from "~/lib/config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (firebaseConfig.apiKey) {
  const isFirstInit = getApps().length === 0;
  app = isFirstInit ? initializeApp(firebaseConfig) : getApp();
  // Keep the user signed in between launches. initializeAuth may run only once
  // per app instance (Fast Refresh re-evaluates this module).
  auth = isFirstInit
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);
  db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
