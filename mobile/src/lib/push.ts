import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { apiFetch } from "~/lib/api";
import { useAuth } from "~/lib/auth";

// Show pushes as banners while the app is open too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Expo needs the EAS project id (set by `eas init`, see docs/mobile-app-plan.md). */
function easProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

let registeredToken: string | null = null;

async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return; // simulators get no push token
  const projectId = easProjectId();
  if (!projectId) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "OONA",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const status = existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiFetch("/api/me/push-tokens", { method: "POST", auth: "required", json: { token, platform: Platform.OS } });
  registeredToken = token;
}

/** Call before signing out so this device stops getting the account's pushes. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await apiFetch(`/api/me/push-tokens?token=${encodeURIComponent(token)}`, { method: "DELETE", auth: "required" }).catch(() => {});
}

function openFromPush(response: Notifications.NotificationResponse | null | undefined) {
  const path = response?.notification.request.content.data?.path;
  if (typeof path === "string" && path.startsWith("/")) router.push(path as never);
}

/** Registers the device once signed in, and opens the screen a tapped push points to. */
export function usePushNotifications() {
  const { user, gate } = useAuth();
  const ready = Boolean(user) && gate === "none";

  useEffect(() => {
    if (!ready) return;
    registerForPush().catch((err) => console.warn("[push] register failed", err));
  }, [ready, user?.uid]);

  useEffect(() => {
    // A push that launched the app from a closed state.
    openFromPush(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(openFromPush);
    return () => sub.remove();
  }, []);
}
