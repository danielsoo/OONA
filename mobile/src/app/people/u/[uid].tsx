import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Loading, Message } from "~/components/ui";
import { loadHandleForUid } from "~/lib/feeds";
import { useLocale } from "~/lib/locale";
import { useApi } from "~/lib/useApi";

/** Website /people/u/[uid]: resolves the handle, then opens the profile. */
export default function PeopleByUidScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { t } = useLocale();
  const resolved = useApi(`uid:${uid}`, () => loadHandleForUid(uid));

  useEffect(() => {
    if (resolved.data?.handle) router.replace(`/people/${resolved.data.handle}`);
  }, [resolved.data?.handle]);

  if (resolved.error) return <Message title={t("common.retry")} body={resolved.error.message} />;
  return <Loading />;
}
