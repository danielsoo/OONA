import { Capacitor } from "@capacitor/core";

/**
 * True when the site is running inside the OONA iOS/Android app (Capacitor WebView),
 * false in a normal browser. Safe to call during SSR: the web build of
 * @capacitor/core reports "web".
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function nativePlatform(): "ios" | "android" | "web" {
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}
