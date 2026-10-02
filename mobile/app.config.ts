import type { ExpoConfig } from "expo/config";

/**
 * OONA native app (iOS + Android).
 *
 * Secrets and per-environment values come from EXPO_PUBLIC_* variables
 * (see .env.example). The Google Sign-In config plugin needs the iOS URL
 * scheme from GoogleService-Info.plist, so it is only added once that value
 * is set; until then Google sign-in is hidden in the app.
 */
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
/** Website host whose links open the app (served files: src/app/.well-known/*). */
const appLinkHost = process.env.APP_LINK_HOST || "xiio.vercel.app";
// Trailing slashes: Android matches by prefix, so "/p" alone would also catch "/people" or "/privacy".
const appLinkPaths = ["/watch/", "/people/", "/collab-invite/", "/messages/", "/p/", "/projects/"];

const plugins: ExpoConfig["plugins"] = [
  "expo-router",
  [
    "expo-splash-screen",
    {
      image: "./assets/splash-icon.png",
      imageWidth: 220,
      resizeMode: "contain",
      backgroundColor: "#0b0b0d",
    },
  ],
  "expo-video",
  "expo-secure-store",
  "expo-font",
  "expo-localization",
  "expo-apple-authentication",
  ["expo-notifications", { color: "#3D7DFF" }],
  [
    "expo-image-picker",
    {
      photosPermission: "OONA opens your photo library so you can choose films, trailers and images to upload.",
      cameraPermission: "OONA uses the camera when you choose to record a video or take a profile photo.",
      microphonePermission: "OONA uses the microphone when you record a video to upload.",
    },
  ],
];

if (googleIosUrlScheme) {
  plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme: googleIosUrlScheme }]);
}

const config: ExpoConfig = {
  name: "OONA",
  slug: "oona",
  scheme: "oona",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  backgroundColor: "#0b0b0d",
  ios: {
    // Store identifier: cannot change after the first App Store upload.
    bundleIdentifier: "com.xiio.oona",
    supportsTablet: true,
    usesAppleSignIn: true,
    associatedDomains: [`applinks:${appLinkHost}`],
    config: { usesNonExemptEncryption: false },
  },
  android: {
    // Store identifier: cannot change after the first Play upload.
    package: "com.xiio.oona",
    adaptiveIcon: {
      backgroundColor: "#0b0b0d",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: appLinkPaths.map((pathPrefix) => ({ scheme: "https", host: appLinkHost, pathPrefix })),
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins,
  // Set by `eas init` (needed for push tokens); EAS_PROJECT_ID overrides.
  extra: process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : undefined,
  experiments: {
    typedRoutes: true,
  },
};

export default config;
