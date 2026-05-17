"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Avatar } from "@/components/primitives/Avatar";
import { Btn } from "@/components/primitives/Btn";
import { Pill } from "@/components/primitives/Pill";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ModerationCommentDTO } from "@/lib/types/comment";

interface Props {
  comment: ModerationCommentDTO;
  /** Headline for the article this comment lives on; loaded by the parent. */
  articleHeadline?: string;
  isSelected?: boolean;
  isMutating?: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  /** Open the detail drawer for inspection. */
  onOpen: () => void;
}

const LONG_CONTENT_CHARS = 280;

/**
 * One row in the moderation queues (`/flagged` + `/comments`). Hard-delete is
 * deliberately omitted — only admins can hard-delete, and this surface ships
 * to editors. The row clamps to 3 lines by default; long content gets an
 * inline expander instead of forcing the drawer open.
 */
export function CommentItem({
  comment,
  articleHeadline,
  isSelected,
  isMutating,
  onSelect,
  onApprove,
  onReject,
  onOpen,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const showExpand = comment.content.length > LONG_CONTENT_CHARS;

  return (
    <div
      data-comment-item
      data-id={comment.id}
      onClick={onSelect}
      className={cn(
        "border-[1.5px] rounded-sm bg-paper p-3 flex items-start gap-3 cursor-pointer",
        "transition-[background,border,transform] duration-[120ms]",
        isSelected
          ? "border-ink shadow-[3px_3px_0_var(--color-ink)] -translate-x-[1px]"
          : "border-ink/15 hover:border-ink hover:bg-paper-2",
      )}
    >
      <Avatar
        name={comment.author?.displayName ?? "—"}
        tone={comment.reportCount > 0 ? "red" : "warm"}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-[13.5px] font-extrabold text-ink truncate">
            {comment.author?.displayName ?? "Anonymous"}
          </span>
          <StatusPill status={comment.status} />
          {comment.reportCount > 0 ? (
            <Pill variant="warn">
              {comment.reportCount} report
              {comment.reportCount === 1 ? "" : "s"}
            </Pill>
          ) : null}
          <span className="font-hand text-[11px] text-muted">
            · {relativeTime(comment.createdAt)}
          </span>
        </div>

        <p
          className={cn(
            "font-sans text-[13px] text-ink leading-relaxed mt-1 whitespace-pre-wrap break-words",
            !expanded && "line-clamp-3",
          )}
        >
          {comment.content}
        </p>

        {showExpand ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="mt-1 inline-flex items-center gap-1 font-hand text-[11px] text-accent hover:underline"
          >
            {expanded ? (
              <>
                Collapse <ChevronUp size={11} />
              </>
            ) : (
              <>
                Expand <ChevronDown size={11} />
              </>
            )}
          </button>
        ) : null}

        <p className="font-hand text-[11px] text-muted mt-1.5 truncate">
          on{" "}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="text-ink hover:underline"
          >
            {articleHeadline ?? "this article"}
          </button>
          {" · "}
          {relativeTime(comment.updatedAt)}
        </p>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <Btn
          size="sm"
          variant="primary"
          disabled={isMutating || comment.status === "approved"}
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          className="!bg-accent-2 !border-accent-2 hover:!bg-accent-2/90"
          title="Approve (a)"
        >
          <Check size={12} /> Approve
        </Btn>
        <Btn
          size="sm"
          variant="ghost"
          disabled={isMutating || comment.status === "rejected"}
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          title="Reject (r)"
        >
          <X size={12} /> Reject
        </Btn>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <Pill variant="green">approved</Pill>;
  if (status === "rejected") return <Pill variant="warn">rejected</Pill>;
  return <Pill variant="ghost">pending</Pill>;
}
