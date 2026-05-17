"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  deleteArticle,
  listMineArticles,
  type ListMineQuery,
} from "@/lib/api/articles.api";
import { listCategories } from "@/lib/api/categories.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { StatusPill } from "@/components/primitives/StatusPill";
import { relativeTime } from "@/lib/utils/format";
import type { ArticleStatus } from "@/lib/types/article";

const STATUS_TABS: Array<{ key: "all" | ArticleStatus; label: string }> = [
  { key: "all", label: "All mine" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "In review" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 20;

export function DraftsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const fetcher = useAuthedApi();
  const toast = useToast();
  const qc = useQueryClient();

  const status = (params.get("status") ?? "draft") as "all" | ArticleStatus;
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const search = params.get("q") ?? "";

  const setParam = useCallback(
    (k: string, v: string | null) => {
      const sp = new URLSearchParams(params.toString());
      if (v == null || v === "") sp.delete(k);
      else sp.set(k, v);
      if (k !== "page") sp.delete("page");
      const qs = sp.toString();
      router.replace(qs ? `/drafts?${qs}` : "/drafts");
    },
    [params, router],
  );

  const apiQuery: ListMineQuery = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      page,
      limit: PAGE_SIZE,
    }),
    [status, page],
  );

  const articlesQuery = useQuery({
    queryKey: ["articles", "mine", apiQuery],
    queryFn: async () => {
      const r = await listMineArticles(fetcher, apiQuery);
      return { items: r.data, total: r.meta?.total ?? r.data.length };
    },
    staleTime: 30_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(fetcher),
    staleTime: 5 * 60_000,
  });
  const categoryById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categoriesQuery.data ?? []) m.set(c.id, c.name);
    return m;
  }, [categoriesQuery.data]);

  const items = useMemo(
    () => articlesQuery.data?.items ?? [],
    [articlesQuery.data],
  );
  const total = articlesQuery.data?.total ?? 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (a) =>
        a.headline.toLowerCase().includes(term) ||
        a.summary.toLowerCase().includes(term),
    );
  }, [items, search]);

  const deleteMu = useMutation({
    mutationFn: (id: string) => deleteArticle(fetcher, id),
    onSuccess: () => {
      toast.success("Draft deleted.");
      qc.invalidateQueries({ queryKey: ["articles", "mine"] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete."),
  });

  function confirmDelete(id: string, headline: string) {
    if (!window.confirm(`Delete draft "${headline}"? This can't be undone.`))
      return;
    deleteMu.mutate(id);
  }

  const hasMore = items.length === PAGE_SIZE || page * PAGE_SIZE < total;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-serif text-[28px] tracking-[-0.02em] font-extrabold leading-tight">
            <span className="uline">My drafts</span>
          </h1>
          <p className="font-hand text-[13px] text-muted mt-1">
            {articlesQuery.isLoading
              ? "Loading…"
              : `${filtered.length} of ${items.length} on page ${page} · ${total} total`}
          </p>
        </div>
        <Link href="/drafts/new">
          <Btn variant="primary">
            <Plus size={13} /> New draft
          </Btn>
        </Link>
      </div>

      {/* Filter strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => {
            const active = status === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setParam("status", t.key === "all" ? null : t.key)}
                className={
                  active
                    ? "px-2.5 py-1 border-[1.5px] border-ink rounded-full font-hand text-[11px] bg-ink text-paper"
                    : "px-2.5 py-1 border-[1.5px] border-ink/30 rounded-full font-hand text-[11px] hover:border-ink hover:bg-paper-2"
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <label className="ml-auto flex items-center gap-1 border-[1.5px] border-ink rounded-sm bg-paper px-2 h-9 min-w-[200px]">
          <Search size={13} aria-hidden className="text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setParam("q", e.target.value || null)}
            placeholder="Search loaded results"
            className="flex-1 bg-transparent outline-none font-sans text-[13px] placeholder:text-muted"
          />
        </label>
      </div>

      {/* Table */}
      <div className="border-[1.5px] border-ink rounded-sm bg-paper overflow-x-auto">
        <table className="w-full font-sans text-[13px] min-w-[760px]">
          <thead className="bg-paper-2 border-b-[1.5px] border-ink">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Headline</th>
              <th className="px-3 py-2 font-semibold w-[110px]">Status</th>
              <th className="px-3 py-2 font-semibold w-[140px]">Category</th>
              <th className="px-3 py-2 font-semibold w-[120px]">Updated</th>
              <th className="px-3 py-2 font-semibold w-[120px] text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {articlesQuery.isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  Loading your drafts…
                </td>
              </tr>
            ) : articlesQuery.isError ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-accent">
                  Couldn&apos;t load your drafts.{" "}
                  <button
                    type="button"
                    onClick={() => articlesQuery.refetch()}
                    className="underline"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  {search
                    ? `No drafts match "${search}".`
                    : status === "draft"
                      ? "No drafts yet. Hit “New draft” to start one."
                      : "Nothing in this status."}
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr
                  key={a.id}
                  className="border-b-[1px] border-ink/10 last:border-b-0 hover:bg-paper-2"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={
                        a.status === "draft" || a.status === "rejected"
                          ? `/drafts/${a.id}/edit`
                          : `/queue/${a.id}`
                      }
                      className="font-serif text-[14px] font-bold leading-tight line-clamp-2 hover:underline"
                    >
                      {a.headline}
                    </Link>
                    <p className="font-hand text-[11px] text-muted line-clamp-1 mt-0.5">
                      {a.summary}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-3 py-2 font-hand text-[12px] text-muted">
                    {categoryById.get(a.categoryId) ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-hand text-[12px] text-muted whitespace-nowrap">
                    {relativeTime(a.updatedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      {a.status === "draft" || a.status === "rejected" ? (
                        <Link href={`/drafts/${a.id}/edit`}>
                          <Btn size="sm" variant="ghost" title="Edit">
                            <Pencil size={11} /> Edit
                          </Btn>
                        </Link>
                      ) : (
                        <Link href={`/queue/${a.id}`}>
                          <Btn size="sm" variant="ghost" title="Open">
                            Open
                          </Btn>
                        </Link>
                      )}
                      {a.status === "draft" ? (
                        <Btn
                          size="sm"
                          variant="ghost"
                          onClick={() => confirmDelete(a.id, a.headline)}
                          disabled={deleteMu.isPending}
                          title="Delete draft"
                        >
                          <Trash2 size={11} />
                        </Btn>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {items.length > 0 || page > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="font-hand text-[12px] text-muted">
            Page {page} · {PAGE_SIZE} per page
          </span>
          <div className="flex items-center gap-2">
            <Btn
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              Prev
            </Btn>
            <Btn
              size="sm"
              variant="ghost"
              disabled={!hasMore}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next
            </Btn>
          </div>
        </div>
      ) : null}

      {/* Caveat note */}
      <p className="font-hand text-[11px] text-muted">
        <Pill variant="ghost">Note</Pill> Editors can only delete their own
        drafts. Submitted, approved, or published articles go through the{" "}
        <Link href="/queue" className="text-accent hover:underline">
          review queue
        </Link>
        .
      </p>
    </div>
  );
}
