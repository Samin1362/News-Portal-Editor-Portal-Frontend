"use client";

import { useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  History,
  MessageSquare,
  Share2,
} from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { listPublished } from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { cn } from "@/lib/utils/cn";
import { fromIsoDay, startOfDay, endOfDay, addDays } from "@/lib/utils/date";
import { formatDate, relativeTime } from "@/lib/utils/format";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { CategoryDTO } from "@/lib/types/category";

const PAGE_SIZE = 24;

type RangeKey = "all" | "today" | "7d" | "30d" | "custom";

const RANGE_CHIPS: Array<{ key: RangeKey; label: string }> = [
  { key: "all", label: "All time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

function rangeWindow(key: RangeKey, fromIso: string | null, toIso: string | null) {
  const now = new Date();
  if (key === "today") {
    return { start: startOfDay(now).getTime(), end: endOfDay(now).getTime() };
  }
  if (key === "7d") {
    return {
      start: startOfDay(addDays(now, -6)).getTime(),
      end: endOfDay(now).getTime(),
    };
  }
  if (key === "30d") {
    return {
      start: startOfDay(addDays(now, -29)).getTime(),
      end: endOfDay(now).getTime(),
    };
  }
  if (key === "custom" && (fromIso || toIso)) {
    const start = fromIso
      ? startOfDay(fromIsoDay(fromIso)).getTime()
      : -Infinity;
    const end = toIso ? endOfDay(fromIsoDay(toIso)).getTime() : Infinity;
    return { start, end };
  }
  return { start: -Infinity, end: Infinity };
}

export function PublishedClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const categoryId = params.get("category") ?? "all";
  const range = (params.get("range") as RangeKey | null) ?? "all";
  const from = params.get("from");
  const to = params.get("to");

  const setParam = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v == null || v === "" || v === "all") sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      router.replace(qs ? `/published?${qs}` : "/published");
    },
    [params, router],
  );

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    staleTime: 5 * 60_000,
  });
  const categoryMap = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    [categoriesQuery.data],
  );

  const feedQuery = useQuery({
    queryKey: ["published-feed", page, PAGE_SIZE],
    queryFn: async () => {
      const r = await listPublished(fetcher, { page, limit: PAGE_SIZE });
      return { items: r.data, total: r.meta?.total ?? r.data.length };
    },
    staleTime: 30_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 60_000
        : false,
  });

  const items: ArticleCardDTO[] = useMemo(
    () => feedQuery.data?.items ?? [],
    [feedQuery.data],
  );
  const total = feedQuery.data?.total ?? 0;

  const visible = useMemo(() => {
    const { start, end } = rangeWindow(range, from, to);
    return items
      .filter((a) => (categoryId === "all" ? true : a.categoryId === categoryId))
      .filter((a) => {
        if (start === -Infinity && end === Infinity) return true;
        const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        if (!at) return false;
        return at >= start && at <= end;
      });
  }, [items, categoryId, range, from, to]);

  const canPrev = page > 1;
  const hasMore = items.length === PAGE_SIZE || page * PAGE_SIZE < total;
  const loading = feedQuery.isLoading;
  const errored = feedQuery.isError;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">Published</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {loading
              ? "Loading feed…"
              : `${visible.length} of ${items.length} on page ${page} · ${total} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill variant="ghost">Read-only feed</Pill>
          <Btn size="sm" variant="ghost" onClick={() => router.push("/queue")}>
            Review queue →
          </Btn>
        </div>
      </div>

      {/* Category chips */}
      {(categoriesQuery.data ?? []).length > 0 ? (
        <div className="flex gap-1.5 flex-wrap">
          <Chip
            label="All categories"
            active={categoryId === "all"}
            onClick={() => setParam({ category: null })}
          />
          {(categoriesQuery.data ?? []).map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={categoryId === c.id}
              onClick={() => setParam({ category: c.id })}
            />
          ))}
        </div>
      ) : null}

      {/* Range chips + custom dates */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {RANGE_CHIPS.map((r) => (
            <Chip
              key={r.key}
              label={r.label}
              active={range === r.key}
              onClick={() =>
                setParam({
                  range: r.key === "all" ? null : r.key,
                  from: null,
                  to: null,
                })
              }
            />
          ))}
          <Chip
            label="Custom"
            active={range === "custom"}
            onClick={() => setParam({ range: "custom" })}
          />
        </div>
        {range === "custom" ? (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 font-hand text-[11px] text-muted">
              From
              <input
                type="date"
                value={from ?? ""}
                onChange={(e) => setParam({ from: e.target.value || null })}
                className="border-[1.5px] border-ink rounded-[4px] px-2 py-1 font-hand text-[12px] bg-paper"
              />
            </label>
            <label className="flex items-center gap-1 font-hand text-[11px] text-muted">
              To
              <input
                type="date"
                value={to ?? ""}
                onChange={(e) => setParam({ to: e.target.value || null })}
                className="border-[1.5px] border-ink rounded-[4px] px-2 py-1 font-hand text-[12px] bg-paper"
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* Grid */}
      {errored ? (
        <div className="border-[1.5px] border-warn rounded-sm bg-warn/10 p-4 font-hand text-[13px]">
          Could not load the feed. Refresh to retry.
        </div>
      ) : loading && visible.length === 0 ? (
        <SkeletonGrid />
      ) : visible.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((a) => (
            <FeedCard
              key={a.id}
              article={a}
              category={categoryMap.get(a.categoryId)}
            />
          ))}
        </ul>
      )}

      {/* Pagination */}
      {visible.length > 0 || page > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-hand text-[12px] text-muted">
            Page {page} · {PAGE_SIZE} per page · backend sort: most recent
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
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-[1.5px] rounded-[4px] px-2.5 py-1 font-hand text-[12px] transition-[background,color,border] duration-[120ms]",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/30 bg-paper text-ink hover:border-ink hover:bg-paper-2",
      )}
    >
      {label}
    </button>
  );
}

function FeedCard({
  article,
  category,
}: {
  article: ArticleCardDTO;
  category?: CategoryDTO;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const publicHref = siteUrl
    ? `${siteUrl.replace(/\/$/, "")}/articles/${article.slug}`
    : null;
  return (
    <li className="flex flex-col border-[1.5px] border-ink rounded-sm bg-paper overflow-hidden">
      {article.featuredImage?.url ? (
        <div className="relative aspect-[16/9] bg-paper-2">
          <Image
            src={article.featuredImage.url}
            alt={article.featuredImage.alt ?? ""}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-paper-2 flex items-center justify-center">
          <span className="font-hand text-[11px] text-muted">No image</span>
        </div>
      )}

      <div className="flex-1 p-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {category ? <Pill variant="ghost">{category.name}</Pill> : null}
          {article.isBreaking ? <Pill variant="red">Breaking</Pill> : null}
          {article.isFeatured ? <Pill variant="solid">Featured</Pill> : null}
          {article.isTrending ? <Pill variant="warn">Trending</Pill> : null}
        </div>

        <h2 className="font-serif text-[16px] font-extrabold leading-tight tracking-[-0.01em] line-clamp-2">
          {article.headline}
        </h2>
        <p className="font-serif text-[13px] text-muted leading-snug line-clamp-2">
          {article.summary}
        </p>

        <p className="font-hand text-[11px] text-muted">
          Published {formatDate(article.publishedAt, true)} ·{" "}
          {relativeTime(article.publishedAt)}
        </p>

        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t-[1px] border-ink/10">
          <div className="flex items-center gap-2 font-hand text-[11px] text-muted">
            <span className="inline-flex items-center gap-0.5">
              <Eye size={11} /> {article.viewCount}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare size={11} /> {article.commentCount}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Share2 size={11} /> {article.shareCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {publicHref ? (
              <a
                href={publicHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-hand text-[11px] text-accent hover:underline"
                title="Open on the public site"
              >
                <ExternalLink size={11} /> View
              </a>
            ) : null}
            <Link
              href={`/queue/${article.id}`}
              className="inline-flex items-center gap-0.5 font-hand text-[11px] text-ink hover:underline"
              title="Open review history"
            >
              <History size={11} /> History
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="border-[1.5px] border-ink/15 rounded-sm bg-paper-2 animate-pulse"
        >
          <div className="aspect-[16/9] bg-ink/5" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-1/3 bg-ink/10 rounded-sm" />
            <div className="h-4 w-full bg-ink/10 rounded-sm" />
            <div className="h-3 w-2/3 bg-ink/10 rounded-sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 p-8 text-center">
      <p className="font-serif text-[22px] font-extrabold tracking-[-0.01em]">
        Nothing matches
      </p>
      <p className="font-hand text-[13px] text-muted mt-1">
        Try a wider date range or switch to All categories.
      </p>
    </div>
  );
}
