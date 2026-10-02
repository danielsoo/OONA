import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

/**
 * Calls `tick` every `intervalMs` while the screen is focused. The website
 * polls DMs every 8s and unread counts every 60s; the app does the same until
 * push notifications land.
 */
export function usePolling(tick: () => void, intervalMs: number, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const id = setInterval(tick, intervalMs);
      return () => clearInterval(id);
    }, [tick, intervalMs, enabled])
  );
}
