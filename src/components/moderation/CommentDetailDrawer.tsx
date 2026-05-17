"use client";

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, MessageSquareOff, X } from "lucide-react";
import { useAuthedApi } from "@/lib/api/useAuthedApi";
import { useToast } from "@/lib/ui/toast";
import { ApiError } from "@/lib/api/client";
import { getArticle, setCommentsEnabled } from "@/lib/api/articles.api";
import { Avatar } from "@/components/primitives/Avatar";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { formatDate, relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type {
  ModerationCommentDTO,
  CommentReport,
} from "@/lib/types/comment";

interface Props {
  comment: ModerationCommentDTO | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isMutating?: boolean;
  /** Optional pre-fetched lookup of reporter id → display name (admin only). */
  reporterNameMap?: Map<string, string>;
}

/**
 * Right-side slide-over for full comment inspection. Editor-only — no
 * hard-delete button. The article-context block loads the FullDTO via the
 * shared `["article", id]` cache key so flipping between drawer + review
 * surface is instant.
 */
export function CommentDetailDrawer({
  comment,
  onClose,
  onApprove,
  onReject,
  isMutating,
  reporterNameMap,
}: Props) {
  const fetcher = useAuthedApi();
  const qc = useQueryClient();
  const toast = useToast();
  const open = !!comment;

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
    queryKey: ["article", comment?.articleId],
    queryFn: () => getArticle(fetcher, comment!.articleId),
    enabled: !!comment?.articleId,
    staleTime: 30_000,
  });

  const commentsToggleMu = useMutation({
    mutationFn: (vars: { id: string; enabled: boolean }) =>
      setCommentsEnabled(fetcher, vars.id, vars.enabled),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["article", data.id] });
      toast.success(
        data.isCommentsEnabled
          ? "Comments enabled on this article."
          : "Comments disabled on this article.",
      );
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not toggle"),
  });

  const reports = useMemo<CommentReport[]>(
    () => comment?.reports ?? [],
    [comment],
  );

  if (!open || !comment) return null;
  if (typeof document === "undefined") return null;

  const article = articleQuery.data;

  return createPortal(
    <div
      data-modal-open="true"
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comment-drawer-title"
    >
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className={cn(
          "relative w-full max-w-[520px] bg-paper border-l-[1.5px] border-ink",
          "flex flex-col shadow-[-6px_0_0_var(--color-ink)]",
        )}
      >
        <header className="flex items-center justify-between gap-2 border-b-[1.5px] border-ink/15 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusPill status={comment.status} />
            {comment.reportCount > 0 ? (
              <Pill variant="warn">
                {comment.reportCount} report
                {comment.reportCount === 1 ? "" : "s"}
              </Pill>
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Author + content */}
          <section className="flex items-start gap-3">
            <Avatar
              name={comment.author?.displayName ?? "—"}
              tone={comment.reportCount > 0 ? "red" : "warm"}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h2
                id="comment-drawer-title"
                className="font-serif text-[18px] font-extrabold leading-tight tracking-[-0.01em]"
              >
                {comment.author?.displayName ?? "Anonymous"}
              </h2>
              <p className="font-hand text-[11.5px] text-muted">
                posted {formatDate(comment.createdAt, true)} ·{" "}
                {comment.likeCount} like
                {comment.likeCount === 1 ? "" : "s"}
              </p>
            </div>
          </section>

          <blockquote className="border-l-[3px] border-ink/30 pl-3 italic font-serif text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </blockquote>

          {/* Article context */}
          <section className="border-[1.5px] border-ink/15 rounded-sm bg-paper-2 p-3">
            <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
              On article
            </p>
            {articleQuery.isLoading ? (
              <p className="font-hand text-[12.5px] text-muted mt-1">
                Loading article…
              </p>
            ) : article ? (
              <>
                <p className="font-serif text-[14px] font-extrabold leading-tight mt-0.5 line-clamp-2">
                  {article.headline}
                </p>
                <p className="font-hand text-[11.5px] text-muted mt-1">
                  {article.status} · {article.commentCount} total comments ·{" "}
                  {article.viewCount} views
                </p>
                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                  <Link href={`/queue/${article.id}`} onClick={onClose}>
                    <Btn size="sm" variant="ghost">
                      Open article <ExternalLink size={11} />
                    </Btn>
                  </Link>
                  <Btn
                    size="sm"
                    variant={article.isCommentsEnabled ? "default" : "primary"}
                    disabled={commentsToggleMu.isPending}
                    onClick={() =>
                      commentsToggleMu.mutate({
                        id: article.id,
                        enabled: !article.isCommentsEnabled,
                      })
                    }
                    title={
                      article.isCommentsEnabled
                        ? "Disable comments on this article"
                        : "Re-enable comments on this article"
                    }
                  >
                    <MessageSquareOff size={11} />
                    {article.isCommentsEnabled
                      ? "Disable comments"
                      : "Enable comments"}
                  </Btn>
                </div>
              </>
            ) : (
              <p className="font-hand text-[12.5px] text-warn mt-1">
                Could not load the parent article.
              </p>
            )}
          </section>

          {/* Reports */}
          <section>
            <p className="font-hand text-[11px] uppercase tracking-[0.08em] text-muted">
              Reports ({reports.length})
            </p>
            {reports.length === 0 ? (
              <p className="font-hand text-[12.5px] text-muted mt-1">
                Nobody has reported this comment.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {reports.map((r, i) => {
                  const name = reporterNameMap?.get(r.userId);
                  return (
                    <li
                      key={`${r.userId}-${i}`}
                      className="border-[1.5px] border-ink/15 rounded-sm bg-paper-2 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-hand text-[12px] font-bold">
                          {name ?? `Reader …${r.userId.slice(-6)}`}
                        </span>
                        <span className="font-hand text-[11px] text-muted">
                          {relativeTime(r.at)}
                        </span>
                      </div>
                      <p className="font-sans text-[12.5px] text-ink mt-1">
                        {r.reason}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <footer className="border-t-[1.5px] border-ink/15 px-4 py-3 flex items-center justify-end gap-2">
          <Btn
            variant="ghost"
            size="sm"
            disabled={isMutating || comment.status === "rejected"}
            onClick={onReject}
            title="Reject (r)"
          >
            <X size={12} /> Reject
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            disabled={isMutating || comment.status === "approved"}
            onClick={onApprove}
            className="!bg-accent-2 !border-accent-2 hover:!bg-accent-2/90"
            title="Approve (a)"
          >
            <Check size={12} /> Approve
          </Btn>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <Pill variant="green">approved</Pill>;
  if (status === "rejected") return <Pill variant="warn">rejected</Pill>;
  return <Pill variant="ghost">pending</Pill>;
}
