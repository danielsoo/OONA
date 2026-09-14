"use client";

import { useMemo } from "react";
import HomeContentRow from "@/components/home/HomeContentRow";
import { useCatalogFeed } from "@/hooks/useCatalogFeed";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { useTranslations } from "@/context/LocaleContext";
import { catalogItemsToHomeStories, watchProgressItemsToHomeStories } from "@/lib/categoryCatalogAdapter";
import { sectionCatalogHref } from "@/lib/works/catalog-ui";
import type { WorkSection } from "@/types/work";

type Props = {
  section: WorkSection;
  ownerUid: string;
  workId: string;
  showFromSameCreator?: boolean;
};

export default function WatchMoreSections({
  section,
  ownerUid,
  workId,
  showFromSameCreator = true,
}: Props) {
  const { t } = useTranslations();
  const { items } = useCatalogFeed(section, 16);
  const { items: continueWatchingAll } = useContinueWatching();

  const moreLikeThis = useMemo(
    () => items.filter((w) => !(w.ownerUid === ownerUid && w.workId === workId)).slice(0, 8),
    [items, ownerUid, workId]
  );
  const fromSameCreator = useMemo(
    () => items.filter((w) => w.ownerUid === ownerUid && w.workId !== workId).slice(0, 8),
    [items, ownerUid, workId]
  );
  const continueWatching = useMemo(
    () => continueWatchingAll.filter((w) => !(w.ownerUid === ownerUid && w.workId === workId)),
    [continueWatchingAll, ownerUid, workId]
  );

  const moreLikeThisStories = useMemo(() => catalogItemsToHomeStories(moreLikeThis), [moreLikeThis]);
  const fromSameCreatorStories = useMemo(() => catalogItemsToHomeStories(fromSameCreator), [fromSameCreator]);
  const continueWatchingStories = useMemo(
    () => watchProgressItemsToHomeStories(continueWatching),
    [continueWatching]
  );

  const viewAllHref = sectionCatalogHref(section);

  return (
    <div className="mt-16 flex flex-col gap-12">
      {moreLikeThisStories.length > 0 ? (
        <HomeContentRow
          title={t("watch.moreLikeThis")}
          viewAllHref={viewAllHref}
          viewAllLabel={t("home.mock.viewAll")}
          items={moreLikeThisStories}
          variant="selects"
        />
      ) : null}

      {showFromSameCreator && fromSameCreatorStories.length > 0 ? (
        <HomeContentRow
          title={t("watch.fromSameCreator")}
          viewAllHref={viewAllHref}
          viewAllLabel={t("home.mock.viewAll")}
          items={fromSameCreatorStories}
          variant="selects"
        />
      ) : null}

      {continueWatchingStories.length > 0 ? (
        <HomeContentRow
          title={t("home.mock.continueWatching")}
          viewAllHref="/my-list"
          viewAllLabel={t("home.mock.viewAll")}
          items={continueWatchingStories}
          variant="featured"
        />
      ) : null}
    </div>
  );
}
