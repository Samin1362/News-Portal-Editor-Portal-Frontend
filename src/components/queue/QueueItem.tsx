"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { relativeTime } from "@/lib/utils/format";
import type { ArticleCardDTO, HistoryDTO } from "@/lib/types/article";
import type { CategoryDTO } from "@/lib/types/category";

interface QueueItemProps {
  article: ArticleCardDTO;
  category?: CategoryDTO;
  authorName?: string;
  isSelected: boolean;
  isCurrentUserReviewer: boolean;
  /** Pre-computed version + submittedAgo from history (or null). */
  versionMeta?: { version: number; submittedAt: string | null };
  /** Word count derived client-side from summary length when content is absent. */
  wordCount: number;
  onSelect: () => void;
  onClaim: () => void;
  onReject: () => void;
  onApprove?: () => void;
  onPublish?: () => void;
  isMutating?: boolean;
}

export function QueueItem({
  article,
  category,
  authorName,
  isSelected,
  isCurrentUserReviewer,
  versionMeta,
  wordCount,
  onSelect,
  onClaim,
  onReject,
  onApprove,
  onPublish,
  isMutating,
}: QueueItemProps) {
  const router = useRouter();
  const isUnderReview = article.status === "under_review";

  const submittedAgo = versionMeta?.submittedAt
    ? relativeTime(versionMeta.submittedAt)
    : "—";

  return (
    <article
      data-queue-item
      data-id={article.id}
      onClick={onSelect}
      className={cn(
        "queue-hov group flex gap-3 items-start",
        "border-[1.5px] border-ink rounded-sm bg-paper p-3 pr-4",
        "transition-[transform,border,box-shadow] duration-[140ms]",
        "cursor-pointer",
        isSelected && "border-accent [box-shadow:-4px_0_0_var(--color-accent)] translate-x-[2px]",
      )}
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-11 h-11 border-[1.5px] border-ink rounded-sm overflow-hidden bg-paper-2 relative">
        {article.featuredImage?.url ? (
          <Image
            src={article.featuredImage.url}
            alt={article.featuredImage.alt ?? ""}
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,var(--color-paper-2)_0_4px,var(--color-canvas)_4px_8px)]" />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {article.isBreaking ? (
            <Pill variant="red" dot dotStatic={false}>
              Priority
            </Pill>
          ) : null}
          {category ? (
            <Pill variant="solid">{category.name}</Pill>
          ) : (
            <Pill variant="ghost">Uncategorised</Pill>
          )}
          <span className="font-hand text-[11px] text-muted">
            {versionMeta ? `v${versionMeta.version} · ` : ""}
            {isUnderReview ? "under review" : "submitted"} {submittedAgo}
          </span>
          {isUnderReview && isCurrentUserReviewer ? (
            <span className="font-hand text-[11px] text-accent">· claimed by you</span>
          ) : null}
        </div>

        <h3 className="font-serif font-extrabold text-[17px] tracking-[-0.01em] leading-[1.25] line-clamp-1">
          {article.headline}
        </h3>

        <p className="font-hand text-[12px] text-muted mt-1 line-clamp-1">
          {authorName ? `By ${authorName}` : "By —"}
          {` · ${wordCount.toLocaleString()} words`}
          {` · deadline ${article.scheduledAt ? relativeTime(article.scheduledAt) : "—"}`}
        </p>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Btn
          size="sm"
          variant="ghost"
          onClick={onReject}
          disabled={isMutating}
        >
          Reject
        </Btn>
        {isUnderReview && isCurrentUserReviewer ? (
          <>
            {onApprove ? (
              <Btn
                size="sm"
                variant="default"
                onClick={onApprove}
                disabled={isMutating}
              >
                Approve
              </Btn>
            ) : null}
            {onPublish ? (
              <Btn
                size="sm"
                variant="primary"
                onClick={onPublish}
                disabled={isMutating}
              >
                Publish
              </Btn>
            ) : null}
          </>
        ) : (
          <Btn
            size="sm"
            variant="primary"
            onClick={() => {
              if (isUnderReview && !isCurrentUserReviewer) {
                router.push(`/queue/${article.id}`);
                return;
              }
              onClaim();
            }}
            disabled={isMutating}
          >
            Review →
          </Btn>
        )}
      </div>
    </article>
  );
}

/** Walks history to derive version + submittedAt for the version-meta line. */
export function deriveVersionMeta(
  history: HistoryDTO[] | undefined,
): { version: number; submittedAt: string | null } | undefined {
  if (!history?.length) return undefined;
  let version = 0;
  let submittedAt: string | null = null;
  for (const h of history) {
    if (h.action === "submit") {
      version += 1;
      submittedAt = h.at;
    }
  }
  if (version === 0) return undefined;
  return { version, submittedAt };
}
