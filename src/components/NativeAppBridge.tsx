"use client";

import { useEffect } from "react";
import { isNativeApp, nativePlatform } from "@/lib/native/platform";

/**
 * App-only behaviour for the iOS/Android shell. Renders nothing and does
 * nothing in a normal browser.
 */
export default function NativeAppBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;

    document.documentElement.classList.add("native-app", `native-${nativePlatform()}`);

    let removeBackListener: (() => void) | undefined;

    void (async () => {
      const [{ App }, { StatusBar, Style }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
      ]);

      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      if (nativePlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#080808" }).catch(() => {});
      }
      await SplashScreen.hide().catch(() => {});

      // Android hardware back: go back in the page history, leave the app at the root.
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else void App.exitApp();
      });
      removeBackListener = () => void handle.remove();
    })();

    return () => removeBackListener?.();
  }, []);

  return null;
}
