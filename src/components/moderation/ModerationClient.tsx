"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { ApiError } from "@/lib/api/client";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  approveComment,
  listAdminComments,
  rejectComment,
} from "@/lib/api/comments.api";
import { getArticle } from "@/lib/api/articles.api";
import { listUsers } from "@/lib/api/users.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { CommentItem } from "./CommentItem";
import { CommentDetailDrawer } from "./CommentDetailDrawer";
import { ModerationShortcutsSheet } from "./ModerationShortcutsSheet";
import { cn } from "@/lib/utils/cn";
import type {
  CommentStatus,
  ModerationCommentDTO,
} from "@/lib/types/comment";

const LIMIT = 20;

type ChipKey = "reported" | "pending" | "approved" | "rejected" | "all";

interface Chip {
  key: ChipKey;
  label: string;
  /** URL params this chip maps to. `null` clears the param. */
  apply: { status: CommentStatus | null; reported: boolean | null };
}

const ALL_CHIPS: Chip[] = [
  { key: "reported", label: "Reported", apply: { status: null, reported: true } },
  { key: "pending", label: "Pending", apply: { status: "pending", reported: null } },
  { key: "approved", label: "Approved", apply: { status: "approved", reported: null } },
  { key: "rejected", label: "Rejected", apply: { status: "rejected", reported: null } },
  { key: "all", label: "All", apply: { status: null, reported: null } },
];

interface Props {
  /**
   * Page title shown in the H1.
   */
  title: string;
  /** Default chip when no URL params are set ("reported" for /flagged, etc). */
  defaultChip: ChipKey;
  /** Chips this surface exposes — `/flagged` is reduced to reported/pending/all. */
  chips: ChipKey[];
  /** Base path for URL writes (eg "/flagged" or "/comments"). */
  basePath: string;
  /** Optional subtitle copy under the title. */
  subtitle?: string;
}

function chipFromParams(
  status: CommentStatus | null,
  reported: boolean | null,
): ChipKey {
  if (reported === true) return "reported";
  if (status) return status;
  if (status === null && reported === null) return "all";
  return "all";
}

/**
 * Shared moderation surface for both `/flagged` and `/comments`. The two
 * routes differ only in their default chip + the chip set they expose;
 * everything else (URL plumbing, mutations, drawer, shortcuts) lives here.
 */
export function ModerationClient({
  title,
  defaultChip,
  chips,
  basePath,
  subtitle,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();
  const qc = useQueryClient();
  const toast = useToast();

  const statusParam = params.get("status") as CommentStatus | null;
  const reportedParam = params.get("reported");
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  // No URL filters ⇒ apply the default chip.
  const usingDefault = !statusParam && !reportedParam && !params.get("page");
  const effectiveChip: ChipKey = useMemo(() => {
    if (usingDefault) return defaultChip;
    if (reportedParam === "true") return "reported";
    if (statusParam === "pending") return "pending";
    if (statusParam === "approved") return "approved";
    if (statusParam === "rejected") return "rejected";
    return chipFromParams(statusParam, reportedParam === "true" ? true : null);
  }, [usingDefault, defaultChip, statusParam, reportedParam]);

  const effectiveQuery = useMemo(() => {
    const chip = ALL_CHIPS.find((c) => c.key === effectiveChip);
    if (!chip) return { status: undefined, reported: undefined };
    return {
      status: chip.apply.status ?? undefined,
      reported:
        chip.apply.reported === null ? undefined : chip.apply.reported,
    };
  }, [effectiveChip]);

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `${basePath}?${qs}` : basePath);
    },
    [params, router, basePath],
  );

  const onPickChip = (key: ChipKey) => {
    const chip = ALL_CHIPS.find((c) => c.key === key)!;
    setParam({
      status: chip.apply.status,
      reported: chip.apply.reported === null ? null : String(chip.apply.reported),
      page: null,
    });
  };

  // Comments page
  const queryKey = [
    "admin-comments",
    effectiveQuery.status ?? null,
    effectiveQuery.reported ?? null,
    page,
  ] as const;

  const commentsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await listAdminComments(fetcher, {
        status: effectiveQuery.status,
        reported: effectiveQuery.reported,
        page,
        limit: LIMIT,
      });
      return { items: result.data, total: result.meta?.total ?? result.data.length };
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const items = useMemo<ModerationCommentDTO[]>(
    () => commentsQuery.data?.items ?? [],
    [commentsQuery.data],
  );
  const total = commentsQuery.data?.total ?? 0;

  // Article-headline lookup — one parallel `useQueries` over the unique
  // articleIds on the current page. Cached under `["article", id]` so the
  // drawer's article block + the review surface stay warm.
  const uniqueArticleIds = useMemo(
    () => Array.from(new Set(items.map((c) => c.articleId))),
    [items],
  );
  const articleQueries = useQueries({
    queries: uniqueArticleIds.map((id) => ({
      queryKey: ["article", id],
      queryFn: () => getArticle(fetcher, id),
      staleTime: 60_000,
    })),
  });
  const headlineMap = useMemo(() => {
    const m = new Map<string, string>();
    articleQueries.forEach((q, i) => {
      const id = uniqueArticleIds[i];
      if (id && q.data) m.set(id, q.data.headline);
    });
    return m;
  }, [articleQueries, uniqueArticleIds]);

  // Reporter-name lookup — only useful when a comment has reports. Lazy, and
  // tolerant of 403 (returns null map ⇒ drawer falls back to "Reader …xxxx").
  const needReporterNames = useMemo(
    () => items.some((c) => c.reportCount > 0),
    [items],
  );
  const reportersQuery = useQuery({
    queryKey: ["users", "reader-name-map"],
    queryFn: async () => {
      const result = await listUsers(fetcher, { role: "reader", limit: 200 });
      if (!result) return null;
      const m = new Map<string, string>();
      for (const u of result.data) m.set(u.id, u.displayName);
      return m;
    },
    enabled: needReporterNames,
    staleTime: 5 * 60_000,
  });

  // Selection — keyboard nav. Default to the first row of the current page.
  const [manualSelection, setManualSelection] = useState<string | null>(null);
  const selectedId = useMemo(() => {
    if (items.length === 0) return null;
    if (manualSelection && items.find((c) => c.id === manualSelection)) {
      return manualSelection;
    }
    return items[0]!.id;
  }, [items, manualSelection]);
  const selected = items.find((c) => c.id === selectedId) ?? null;

  // Drawer
  const [drawerFor, setDrawerFor] = useState<string | null>(null);
  const drawerComment = items.find((c) => c.id === drawerFor) ?? null;

  // Shortcuts sheet
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Mutations — optimistic
  const optimisticPatch = (
    id: string,
    next: Partial<ModerationCommentDTO>,
  ) => {
    qc.setQueriesData<{ items: ModerationCommentDTO[]; total: number }>(
      { queryKey: ["admin-comments"] },
      (curr) => {
        if (!curr) return curr;
        return {
          ...curr,
          items: curr.items.map((c) => (c.id === id ? { ...c, ...next } : c)),
        };
      },
    );
  };

  const approveMu = useMutation({
    mutationFn: (id: string) => approveComment(fetcher, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["admin-comments"] });
      const snapshot = qc.getQueriesData<{
        items: ModerationCommentDTO[];
        total: number;
      }>({ queryKey: ["admin-comments"] });
      optimisticPatch(id, { status: "approved" });
      return { snapshot };
    },
    onError: (err, _id, ctx) => {
      ctx?.snapshot.forEach(([k, v]) => qc.setQueryData(k, v));
      toast.error(err instanceof ApiError ? err.message : "Approve failed");
    },
    onSuccess: () => {
      toast.success("Comment approved");
      qc.invalidateQueries({ queryKey: ["admin-comments"] });
      qc.invalidateQueries({ queryKey: ["comments", "count", "pending"] });
      qc.invalidateQueries({ queryKey: ["comments", "count", "reported"] });
    },
  });

  const rejectMu = useMutation({
    mutationFn: (id: string) => rejectComment(fetcher, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["admin-comments"] });
      const snapshot = qc.getQueriesData<{
        items: ModerationCommentDTO[];
        total: number;
      }>({ queryKey: ["admin-comments"] });
      optimisticPatch(id, { status: "rejected" });
      return { snapshot };
    },
    onError: (err, _id, ctx) => {
      ctx?.snapshot.forEach(([k, v]) => qc.setQueryData(k, v));
      toast.error(err instanceof ApiError ? err.message : "Reject failed");
    },
    onSuccess: () => {
      toast.success("Comment rejected");
      qc.invalidateQueries({ queryKey: ["admin-comments"] });
      qc.invalidateQueries({ queryKey: ["comments", "count", "pending"] });
      qc.invalidateQueries({ queryKey: ["comments", "count", "reported"] });
    },
  });

  const anyMutating = approveMu.isPending || rejectMu.isPending;

  function moveSelection(dir: 1 | -1) {
    if (items.length === 0) return;
    const idx = items.findIndex((c) => c.id === selectedId);
    const next = (idx + dir + items.length) % items.length;
    const nextRow = items[next]!;
    setManualSelection(nextRow.id);
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-comment-item][data-id="${nextRow.id}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }

  useKeyboardShortcuts(
    [
      { key: "j", handler: () => moveSelection(1) },
      { key: "k", handler: () => moveSelection(-1) },
      {
        key: "Enter",
        handler: () => {
          if (selectedId) setDrawerFor(selectedId);
        },
      },
      {
        key: "a",
        handler: () => {
          if (!selected || selected.status === "approved") return;
          approveMu.mutate(selected.id);
        },
      },
      {
        key: "r",
        handler: () => {
          if (!selected || selected.status === "rejected") return;
          rejectMu.mutate(selected.id);
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

  const hasMore = items.length === LIMIT || page * LIMIT < total;
  const canPrev = page > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">{title}</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {commentsQuery.isLoading
              ? "Loading…"
              : `${total} total · showing ${items.length} on page ${page}`}
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill variant="ghost">Auto-refresh · 60s</Pill>
          <Btn size="sm" variant="ghost" onClick={() => setShowShortcuts(true)}>
            ? Shortcuts
          </Btn>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {chips.map((key) => {
          const c = ALL_CHIPS.find((x) => x.key === key)!;
          const active = effectiveChip === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => onPickChip(key)}
              className={cn(
                "border-[1.5px] rounded-[4px] px-2.5 py-1 font-hand text-[12px] transition-[background,color,border] duration-[120ms]",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/30 bg-paper text-ink hover:border-ink hover:bg-paper-2",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {commentsQuery.isError ? (
        <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
          Could not load comments:{" "}
          {(commentsQuery.error as ApiError)?.message ?? "unknown error"}
        </div>
      ) : items.length === 0 && !commentsQuery.isLoading ? (
        <EmptyState chip={effectiveChip} />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              articleHeadline={headlineMap.get(c.articleId)}
              isSelected={c.id === selectedId}
              isMutating={anyMutating}
              onSelect={() => setManualSelection(c.id)}
              onApprove={() => approveMu.mutate(c.id)}
              onReject={() => rejectMu.mutate(c.id)}
              onOpen={() => setDrawerFor(c.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {items.length > 0 || page > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-hand text-[12px] text-muted">
            Page {page} · {LIMIT} per page
          </span>
          <div className="flex items-center gap-2">
            <Btn
              size="sm"
              variant="ghost"
              disabled={!canPrev}
              onClick={() => setParam({ page: String(page - 1) })}
            >
              <ChevronLeft size={12} /> Prev
            </Btn>
            <Btn
              size="sm"
              variant="ghost"
              disabled={!hasMore}
              onClick={() => setParam({ page: String(page + 1) })}
            >
              Next <ChevronRight size={12} />
            </Btn>
          </div>
        </div>
      ) : null}

      <CommentDetailDrawer
        comment={drawerComment}
        onClose={() => setDrawerFor(null)}
        onApprove={() => {
          if (drawerComment) {
            approveMu.mutate(drawerComment.id);
            setDrawerFor(null);
          }
        }}
        onReject={() => {
          if (drawerComment) {
            rejectMu.mutate(drawerComment.id);
            setDrawerFor(null);
          }
        }}
        isMutating={anyMutating}
        reporterNameMap={reportersQuery.data ?? undefined}
      />

      <ModerationShortcutsSheet
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}

function EmptyState({ chip }: { chip: ChipKey }) {
  const copy =
    chip === "reported"
      ? {
          headline: "No flagged comments",
          sub: "The community is behaving. Nothing in the reported queue.",
        }
      : chip === "pending"
        ? {
            headline: "No pending comments",
            sub: "Every comment has been moderated. Take a breath.",
          }
        : chip === "approved"
          ? {
              headline: "Nothing approved on this page",
              sub: "Try the Pending or Reported filter to find work.",
            }
          : chip === "rejected"
            ? {
                headline: "Nothing rejected on this page",
                sub: "Past rejections show up here; you're current.",
              }
            : {
                headline: "No comments match",
                sub: "Adjust the filter chips above to see other states.",
              };
  return (
    <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-8 text-center">
      <p className="font-serif text-[22px] font-extrabold tracking-[-0.01em]">
        {copy.headline}
      </p>
      <p className="font-hand text-[13px] text-muted mt-1">{copy.sub}</p>
    </div>
  );
}
