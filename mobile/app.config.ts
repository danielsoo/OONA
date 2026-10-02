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
  },
  plugins,
  experiments: {
    typedRoutes: true,
  },
};

export default config;
