"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listQueue } from "@/lib/api/articles.api";
import { listAdminComments } from "@/lib/api/comments.api";

export interface DeskCounts {
  /** Total `submitted` articles waiting on the queue. */
  queue: number | undefined;
  /** Total reported (flagged) comments. */
  flagged: number | undefined;
}

/**
 * Shared count hook — feeds the sidebar badges, the "Awaiting review" KPI,
 * and (later phases) the ticker. Each value is `undefined` while loading or
 * if the call fails, so the consumer can decide between showing "—" or
 * falling back to a mock.
 */
export function useDeskCounts(): DeskCounts {
  const fetcher = useAuthedApi();

  const queueTotal = useQuery({
    queryKey: ["queue", "count", "submitted"],
    queryFn: async () => {
      const result = await listQueue(fetcher, { status: "submitted", limit: 1 });
      return result.meta?.total ?? result.data.length;
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const flaggedTotal = useQuery({
    queryKey: ["comments", "count", "reported"],
    queryFn: async () => {
      const result = await listAdminComments(fetcher, { reported: true, limit: 1 });
      return result.meta?.total ?? result.data.length;
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  return {
    queue: queueTotal.data,
    flagged: flaggedTotal.data,
  };
}
