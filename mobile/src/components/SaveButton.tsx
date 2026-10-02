import { router } from "expo-router";
import { useState } from "react";
import { Button } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { isSaved, setSaved } from "~/lib/discovery";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";

/** Add to / remove from My List (website WatchlistButton). */
export function SaveButton({ ownerUid, workId }: { ownerUid: string; workId: string }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const saved = useApi(user ? `saved:${user.uid}:${ownerUid}:${workId}` : null, () => isSaved(ownerUid, workId));
  const [override, setOverride] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const current = override ?? saved.data ?? false;

  return (
    <Button
      variant="secondary"
      label={current ? t("watchlist.inList") : t("watchlist.add")}
      loading={busy}
      onPress={async () => {
        if (!user) {
          router.push("/login");
          return;
        }
        setBusy(true);
        try {
          setOverride(await setSaved(ownerUid, workId, !current));
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
