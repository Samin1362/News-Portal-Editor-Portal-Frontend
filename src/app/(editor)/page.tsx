"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listQueue } from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { listUsers } from "@/lib/api/users.api";
import { listAdminComments } from "@/lib/api/comments.api";
import { getHomepage } from "@/lib/api/public.api";
import { useDeskCounts } from "@/hooks/useDeskCounts";
import { ViewingAsAdminBanner } from "@/components/shell/ViewingAsAdminBanner";
import { Greeting } from "@/components/insights/Greeting";
import { ActionsRow } from "@/components/insights/ActionsRow";
import { KpiGrid } from "@/components/insights/KpiGrid";
import { TodayReviewQueuePreview } from "@/components/insights/TodayReviewQueuePreview";
import { TodaySchedule } from "@/components/insights/TodaySchedule";
import { FlaggedCommentsPreview } from "@/components/insights/FlaggedCommentsPreview";
import { WeekStrip } from "@/components/insights/WeekStrip";
import { ReportersWorkload } from "@/components/insights/ReportersWorkload";
import { TopStoriesToday } from "@/components/insights/TopStoriesToday";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { UserDTO } from "@/lib/types/user";

export default function TodayPage() {
  const fetcher = useAuthedApi();
  const counts = useDeskCounts();

  const queueQuery = useQuery({
    queryKey: ["queue", "all", "today"],
    queryFn: async () => {
      const [submitted, underReview] = await Promise.all([
        listQueue(fetcher, { status: "submitted", page: 1, limit: 25 }),
        listQueue(fetcher, { status: "under_review", page: 1, limit: 25 }),
      ]);
      return [...submitted.data, ...underReview.data];
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    staleTime: 5 * 60_000,
  });

  const homepageQuery = useQuery({
    queryKey: ["public", "homepage"],
    queryFn: () => getHomepage(fetcher),
    staleTime: 60_000,
  });

  const reportersQuery = useQuery({
    queryKey: ["users", "journalist-list"],
    queryFn: async () => {
      const result = await listUsers(fetcher, { role: "journalist", limit: 50 });
      // null = forbidden → degrade gracefully (editor view)
      return result?.data ?? null;
    },
    staleTime: 5 * 60_000,
  });

  const flaggedQuery = useQuery({
    queryKey: ["comments", "reported-preview"],
    queryFn: async () => {
      const result = await listAdminComments(fetcher, { reported: true, limit: 3 });
      return result.data;
    },
    staleTime: 60_000,
  });

  const categoryMap = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    [categoriesQuery.data],
  );

  const queueItems: ArticleCardDTO[] = useMemo(
    () => queueQuery.data ?? [],
    [queueQuery.data],
  );
  const homepage = homepageQuery.data;
  const reporters: UserDTO[] | null = reportersQuery.data ?? null;

  // Snapshot of "now" — captured once per mount to keep render pure. The
  // hourly drift is acceptable for the cutoff windows below; React will
  // re-evaluate when the user reloads or revisits the tab.
  const [nowMs] = useState(() => Date.now());

  // Reads · today — sum viewCount across the homepage's `latest` list.
  const todaysReads = useMemo(() => {
    if (!homepage) return undefined;
    return homepage.latest.reduce((sum, a) => sum + (a.viewCount ?? 0), 0);
  }, [homepage]);

  // Published-today count — `latest` from the homepage is the most recent
  // published list; filter by publishedAt within last 24h.
  const publishedToday = useMemo(() => {
    if (!homepage) return undefined;
    const since = nowMs - 24 * 60 * 60 * 1000;
    return homepage.latest.filter(
      (a) => a.publishedAt && new Date(a.publishedAt).getTime() >= since,
    ).length;
  }, [homepage, nowMs]);

  // Scheduled today — best effort: any submitted/under-review article whose
  // `scheduledAt` falls in the next 24h. Backend doesn't yet expose approved
  // articles to the editor, so this is sparse on purpose.
  const scheduledToday = useMemo(() => {
    const cutoff = nowMs + 24 * 60 * 60 * 1000;
    return queueItems
      .filter(
        (a) =>
          a.scheduledAt &&
          new Date(a.scheduledAt).getTime() <= cutoff &&
          new Date(a.scheduledAt).getTime() >= nowMs,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime(),
      );
  }, [queueItems, nowMs]);

  return (
    <div className="flex flex-col gap-5">
      <ViewingAsAdminBanner />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <Greeting storiesOnPlate={counts.queue} />
        <ActionsRow />
      </div>

      <KpiGrid
        awaitingReview={counts.queue}
        todaysReads={todaysReads}
        publishedToday={publishedToday}
        flaggedComments={counts.flagged}
      />

      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-start">
        <TodayReviewQueuePreview
          items={queueItems}
          categoryMap={categoryMap}
          isLoading={queueQuery.isLoading}
        />
        <div className="flex flex-col gap-4 min-w-0">
          <TodaySchedule scheduled={scheduledToday} />
          <FlaggedCommentsPreview
            items={flaggedQuery.data ?? []}
            isLoading={flaggedQuery.isLoading}
          />
        </div>
      </section>

      <WeekStrip />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <ReportersWorkload reporters={reporters} queue={queueItems} />
        <TopStoriesToday
          items={homepage?.trending ?? []}
          isLoading={homepageQuery.isLoading}
        />
      </section>
    </div>
  );
}
