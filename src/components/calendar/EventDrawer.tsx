"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { X, ExternalLink } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { getArticle } from "@/lib/api/articles.api";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CategoryDTO } from "@/lib/types/category";

interface Props {
  /** Article id to load, or null to keep the drawer closed. */
  articleId: string | null;
  onClose: () => void;
  categoryMap: Map<string, CategoryDTO>;
}

/**
 * Right-side slide-over for in-place article peek. Loads the full DTO via
 * the same `["article", id]` cache key the review surface uses so navigating
 * to `/queue/[id]` is instant after the drawer pre-warms it.
 */
export function EventDrawer({ articleId, onClose, categoryMap }: Props) {
  const fetcher = useAuthedApi();
  const open = !!articleId;

  // Escape-to-close + body-scroll lock.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const articleQuery = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => getArticle(fetcher, articleId!),
    enabled: !!articleId,
    staleTime: 30_000,
  });

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const article = articleQuery.data;
  const category = article ? categoryMap.get(article.categoryId) : undefined;

  return createPortal(
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <button
        type="button"
        aria-label="Close peek"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative w-full max-w-[480px] bg-paper border-l-[1.5px] border-ink",
          "flex flex-col shadow-[-6px_0_0_var(--color-ink)]",
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b-[1.5px] border-ink/15 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Pill
              variant={article?.status === "published" ? "green" : "red"}
            >
              {article?.status ?? "…"}
            </Pill>
            {category ? (
              <Pill variant="ghost">{category.name}</Pill>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="border-[1.5px] border-ink rounded-sm w-7 h-7 flex items-center justify-center hover:bg-paper-2"
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {articleQuery.isLoading || !article ? (
            <p className="font-hand text-[13px] text-muted">Loading article…</p>
          ) : articleQuery.isError ? (
            <p className="font-hand text-[13px] text-warn">
              Could not load this article.
            </p>
          ) : (
            <>
              <h2
                id="drawer-title"
                className="font-serif text-[22px] tracking-[-0.02em] font-extrabold leading-tight"
              >
                {article.headline}
              </h2>
              <p className="font-serif text-[14px] text-muted leading-snug mt-1">
                {article.summary}
              </p>

              <dl className="grid grid-cols-2 gap-3 text-[13px] mt-4 border-t-[1.5px] border-ink/10 pt-3">
                <Field
                  label={article.scheduledAt ? "Scheduled" : "Published"}
                  value={formatDate(
                    article.scheduledAt ?? article.publishedAt,
                    true,
                  )}
                />
                <Field
                  label="Last updated"
                  value={formatDate(article.updatedAt, true)}
                />
                <Field label="Views" value={String(article.viewCount)} />
                <Field
                  label="Comments"
                  value={String(article.commentCount)}
                />
              </dl>

              {article.featuredImage?.url ? (
                <div className="mt-4 relative w-full h-[200px] rounded-sm border-[1.5px] border-ink/10 overflow-hidden">
                  <Image
                    src={article.featuredImage.url}
                    alt={article.featuredImage.alt ?? ""}
                    fill
                    sizes="(max-width: 480px) 100vw, 480px"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="border-t-[1.5px] border-ink/15 px-4 py-3 flex items-center justify-end gap-2">
          <Btn variant="ghost" size="sm" onClick={onClose}>
            Close
          </Btn>
          {article ? (
            <Link href={`/queue/${article.id}`} onClick={onClose}>
              <Btn variant="primary" size="sm">
                Open full review <ExternalLink size={12} />
              </Btn>
            </Link>
          ) : null}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
        {label}
      </dt>
      <dd className="font-sans text-[13px] text-ink">{value}</dd>
    </div>
  );
}
