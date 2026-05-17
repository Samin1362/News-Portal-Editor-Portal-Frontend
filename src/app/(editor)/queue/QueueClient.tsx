"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/EditorAuthProvider";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  approveArticle,
  getArticle,
  listQueue,
  publishArticle,
  rejectArticle,
  scheduleArticle,
  startReview,
} from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { listUsers } from "@/lib/api/users.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { QueueFilters } from "@/components/queue/QueueFilters";
import {
  QueueItem,
  deriveVersionMeta,
} from "@/components/queue/QueueItem";
import { QueueShortcutsSheet } from "@/components/queue/QueueShortcutsSheet";
import { RejectionDialog } from "@/components/review/RejectionDialog";
import { ApproveDialog } from "@/components/review/ApproveDialog";
import { ScheduleDialog } from "@/components/review/ScheduleDialog";
import type {
  ArticleCardDTO,
  ArticleFullDTO,
  HistoryDTO,
  QueueStatus,
} from "@/lib/types/article";
import type { ApiError } from "@/lib/api/client";

const LIMIT = 20;

type StatusFilter = QueueStatus | "all";

interface QueueRow extends ArticleCardDTO {
  /** Resolved when the row is open in cache as the FullDTO. */
  reviewerId?: string | null;
  history?: HistoryDTO[];
}

export function QueueClient() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const fetcher = useAuthedApi();
  const { profile } = useAuth();
  const toast = useToast();

  const status = (params.get("status") ?? "all") as StatusFilter;
  const categoryId = params.get("category") ?? "all";
  const page = Number(params.get("page") ?? "1") || 1;

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "" || v === "all") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/queue?${qs}` : "/queue");
    },
    [params, router],
  );

  // Queue list — when "all" we paginate twice (submitted then under_review) on
  // the client and merge. For Phase 2 we keep it simple: fetch one bucket if
  // filtered, otherwise fetch both in parallel.
  const queueQuery = useQuery({
    queryKey: ["queue", status, page],
    queryFn: async () => {
      if (status === "all") {
        const [submitted, underReview] = await Promise.all([
          listQueue(fetcher, { status: "submitted", page: 1, limit: LIMIT }),
          listQueue(fetcher, { status: "under_review", page: 1, limit: LIMIT }),
        ]);
        return [...submitted.data, ...underReview.data];
      }
      const result = await listQueue(fetcher, { status, page, limit: LIMIT });
      return result.data;
    },
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
    staleTime: 30_000,
  });

  // Categories (filter chips). Cached longer — they rarely change.
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    staleTime: 5 * 60_000,
  });

  // Best-effort author lookup. Editors get 403, admins succeed. Empty Map
  // is fine — the QueueItem falls back to "By —".
  const authorsQuery = useQuery({
    queryKey: ["users", "journalist-map"],
    queryFn: async () => {
      const result = await listUsers(fetcher, { role: "journalist", limit: 100 });
      if (!result) return new Map<string, string>();
      const m = new Map<string, string>();
      for (const u of result.data) m.set(u.id, u.displayName);
      return m;
    },
    staleTime: 5 * 60_000,
  });

  const filteredRows: QueueRow[] = useMemo(() => {
    const items = queueQuery.data ?? [];
    return items
      .filter((a) => (categoryId === "all" ? true : a.categoryId === categoryId))
      // Pull richer fields from any per-article cache so we can render
      // claimed-by-you / version meta without re-fetching.
      .map((a) => {
        const full = qc.getQueryData<ArticleFullDTO>(["article", a.id]);
        return {
          ...a,
          reviewerId: full?.reviewerId,
          history: full?.history,
        } satisfies QueueRow;
      });
  }, [queueQuery.data, categoryId, qc]);

  // Selection + keyboard nav — derived from rows + an optional user pick.
  const [manualSelection, setManualSelection] = useState<string | null>(null);
  const selectedId = useMemo(() => {
    if (filteredRows.length === 0) return null;
    if (manualSelection && filteredRows.find((r) => r.id === manualSelection)) {
      return manualSelection;
    }
    return filteredRows[0]!.id;
  }, [filteredRows, manualSelection]);
  const setSelectedId = setManualSelection;

  // Mutations
  const claimMu = useMutation({
    mutationFn: (id: string) => startReview(fetcher, id),
    onSuccess: (full) => {
      qc.setQueryData(["article", full.id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Could not claim"),
  });

  const approveMu = useMutation({
    mutationFn: (id: string) => approveArticle(fetcher, id),
    onSuccess: (full) => {
      qc.setQueryData(["article", full.id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Approved");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Approve failed"),
  });

  const publishMu = useMutation({
    mutationFn: (id: string) => publishArticle(fetcher, id),
    onSuccess: (full) => {
      qc.setQueryData(["article", full.id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Published");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Publish failed"),
  });

  const scheduleMu = useMutation({
    mutationFn: (vars: { id: string; iso: string }) =>
      scheduleArticle(fetcher, vars.id, vars.iso),
    onSuccess: (full) => {
      qc.setQueryData(["article", full.id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Scheduled");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Schedule failed"),
  });

  const rejectMu = useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      rejectArticle(fetcher, vars.id, vars.reason),
    onSuccess: (full) => {
      qc.setQueryData(["article", full.id], full);
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Rejected");
    },
    onError: (err: ApiError) => toast.error(err.message ?? "Reject failed"),
  });

  const anyMutating =
    claimMu.isPending ||
    approveMu.isPending ||
    publishMu.isPending ||
    scheduleMu.isPending ||
    rejectMu.isPending;

  // Dialog state
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [approveFor, setApproveFor] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const selected = filteredRows.find((r) => r.id === selectedId);
  const isSelfReviewer = (row: QueueRow): boolean =>
    !!row.reviewerId && !!profile && row.reviewerId === profile.id;

  // When we open a row, also prefetch the full DTO so claimed-by-you, version
  // meta, and history all populate naturally.
  useEffect(() => {
    if (!selectedId) return;
    qc.prefetchQuery({
      queryKey: ["article", selectedId],
      queryFn: () => getArticle(fetcher, selectedId),
      staleTime: 30_000,
    });
  }, [selectedId, fetcher, qc]);

  // --- Keyboard shortcuts ---
  useKeyboardShortcuts(
    [
      {
        key: "j",
        handler: () => moveSelection(1),
      },
      {
        key: "k",
        handler: () => moveSelection(-1),
      },
      {
        key: "Enter",
        handler: () => {
          if (selectedId) router.push(`/queue/${selectedId}`);
        },
      },
      {
        key: "a",
        handler: () => {
          if (!selected) return;
          if (selected.status !== "under_review" || !isSelfReviewer(selected)) {
            toast.info("Claim it first (press Enter to open, then Approve).");
            return;
          }
          setApproveFor(selected.id);
        },
      },
      {
        key: "r",
        handler: () => {
          if (selected) setRejectFor(selected.id);
        },
      },
      {
        key: "p",
        handler: () => {
          if (!selected) return;
          if (selected.status !== "approved") {
            toast.info("Only approved articles can be published.");
            return;
          }
          publishMu.mutate(selected.id);
        },
      },
      {
        key: "?",
        global: true,
        handler: () => setShowShortcuts((s) => !s),
      },
    ],
    { enabled: true },
  );

  function moveSelection(dir: 1 | -1) {
    if (filteredRows.length === 0) return;
    const idx = filteredRows.findIndex((r) => r.id === selectedId);
    const next = (idx + dir + filteredRows.length) % filteredRows.length;
    const nextRow = filteredRows[next]!;
    setSelectedId(nextRow.id);
    // Scroll into view
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-queue-item][data-id="${nextRow.id}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  const cats = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const authors = authorsQuery.data;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">Review queue</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {queueQuery.isLoading
              ? "Loading…"
              : `${filteredRows.length} item${filteredRows.length === 1 ? "" : "s"} waiting`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill variant="ghost">Auto-refresh · 60s</Pill>
          <Btn size="sm" variant="ghost" onClick={() => setShowShortcuts(true)}>
            ? Shortcuts
          </Btn>
        </div>
      </div>

      {/* Filters */}
      <QueueFilters
        categories={cats}
        selectedCategoryId={categoryId}
        onCategoryChange={(c) => setParam({ category: c, page: null })}
        selectedStatus={status}
        onStatusChange={(s) => setParam({ status: s, page: null })}
      />

      {/* List */}
      {queueQuery.isError ? (
        <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
          Could not load the queue: {(queueQuery.error as ApiError)?.message}
        </div>
      ) : filteredRows.length === 0 && !queueQuery.isLoading ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredRows.map((row) => {
            const cat = catMap.get(row.categoryId);
            const versionMeta = deriveVersionMeta(row.history);
            const wordCount =
              row.summary.split(/\s+/).filter(Boolean).length || 0;
            const authorName = authors?.get(row.authorId);
            return (
              <QueueItem
                key={row.id}
                article={row}
                category={cat}
                authorName={authorName}
                isSelected={row.id === selectedId}
                isCurrentUserReviewer={isSelfReviewer(row)}
                versionMeta={versionMeta}
                wordCount={wordCount}
                isMutating={anyMutating}
                onSelect={() => setSelectedId(row.id)}
                onClaim={() => {
                  claimMu.mutate(row.id, {
                    onSuccess: () => router.push(`/queue/${row.id}`),
                  });
                }}
                onReject={() => setRejectFor(row.id)}
                onApprove={
                  row.status === "under_review" && isSelfReviewer(row)
                    ? () => setApproveFor(row.id)
                    : undefined
                }
                onPublish={undefined}
              />
            );
          })}
          {queueQuery.isLoading ? (
            <div className="font-hand text-[12px] text-muted py-3 text-center">
              Refreshing…
            </div>
          ) : null}
        </div>
      )}

      {/* Dialogs */}
      <RejectionDialog
        open={!!rejectFor}
        onClose={() => setRejectFor(null)}
        isSubmitting={rejectMu.isPending}
        headline={filteredRows.find((r) => r.id === rejectFor)?.headline}
        onConfirm={async (reason) => {
          if (!rejectFor) return;
          await rejectMu.mutateAsync({ id: rejectFor, reason });
          setRejectFor(null);
        }}
      />
      <ApproveDialog
        open={!!approveFor}
        onClose={() => setApproveFor(null)}
        headline={filteredRows.find((r) => r.id === approveFor)?.headline}
        isSubmitting={approveMu.isPending || publishMu.isPending}
        onPublishNow={async () => {
          if (!approveFor) return;
          // Approve first (under_review → approved), then publish.
          const id = approveFor;
          await approveMu.mutateAsync(id);
          await publishMu.mutateAsync(id);
          setApproveFor(null);
        }}
        onSchedule={async () => {
          if (!approveFor) return;
          const id = approveFor;
          await approveMu.mutateAsync(id);
          setApproveFor(null);
          setScheduleFor(id);
        }}
      />
      <ScheduleDialog
        open={!!scheduleFor}
        onClose={() => setScheduleFor(null)}
        headline={filteredRows.find((r) => r.id === scheduleFor)?.headline}
        isSubmitting={scheduleMu.isPending}
        onConfirm={async (iso) => {
          if (!scheduleFor) return;
          await scheduleMu.mutateAsync({ id: scheduleFor, iso });
          setScheduleFor(null);
        }}
      />
      <QueueShortcutsSheet
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-8 text-center">
      <p className="font-serif text-[22px] font-extrabold tracking-[-0.01em]">
        Queue is clear
      </p>
      <p className="font-hand text-[13px] text-muted mt-1">
        Nothing to review right now. Go publish something — or grab a coffee.
      </p>
    </div>
  );
}
