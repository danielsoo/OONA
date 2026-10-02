import type { CapacitorConfig } from "@capacitor/cli";

/**
 * OONA iOS / Android apps.
 *
 * The site depends on Next.js API routes and server rendering, so it cannot be
 * exported as static files. The apps load the deployed site instead
 * (`server.url`), and `mobile-shell/` is only the offline fallback bundled
 * into the app. Point CAP_SERVER_URL at a preview deployment to test one.
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://xiio.vercel.app";

const config: CapacitorConfig = {
  // Store identifier: cannot change after the first upload to either store.
  appId: "com.xiio.oona",
  appName: "OONA",
  webDir: "mobile-shell",
  backgroundColor: "#080808",
  server: {
    url: serverUrl,
    cleartext: false,
    errorPath: "offline.html",
    // Hosts the WebView may navigate to itself; anything else opens in the system browser.
    allowNavigation: ["*.firebaseapp.com", "nid.naver.com", "kauth.kakao.com", "accounts.kakao.com"],
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: "6.1",
        // Avoids a SwiftPM package identity collision (capacitor-firebase issue 959).
        packageOptions: {
          "@capacitor-firebase/authentication": { symlink: true },
        },
        // Keep the GoogleSignIn SDK, leave out the Facebook SDK.
        packageTraits: {
          "@capacitor-firebase/authentication": ["Google"],
        },
      },
    },
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#080808",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#080808",
    },
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com", "apple.com"],
    },
  },
};

export default config;
