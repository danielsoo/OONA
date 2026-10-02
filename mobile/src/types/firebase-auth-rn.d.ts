// firebase/auth resolves to its React Native build in Metro (package "react-native"
// export condition), which adds getReactNativePersistence. The default typings
// are the browser build's, so declare it here.
import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
