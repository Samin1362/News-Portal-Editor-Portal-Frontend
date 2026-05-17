"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Pill } from "@/components/primitives/Pill";
import { minuteOfDay, hhmm } from "@/lib/utils/date";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { CategoryDTO } from "@/lib/types/category";

interface Props {
  article: ArticleCardDTO;
  /** "approved" (draggable, accent-red) or "published" (locked, accent-green). */
  kind: "approved" | "published";
  category?: CategoryDTO;
  /** Px-per-hour scale (timeline parent controls; we just multiply). */
  pxPerHour: number;
  /** Drag origin token — the timeline reads this from `dataTransfer`. */
  draggingId?: string | null;
  onDragStart?: (article: ArticleCardDTO) => void;
  onDragEnd?: () => void;
  /** Surfaces the conflict-warning tint when another block within ±5 minutes. */
  hasConflict?: boolean;
}

/**
 * One article block on the day timeline. Positioned absolutely by
 * `scheduledAt` (approved) or `publishedAt` (published); height fixed at
 * 56px so the block reads regardless of when in the hour it sits.
 */
export function TimelineBlock({
  article,
  kind,
  category,
  pxPerHour,
  draggingId,
  onDragStart,
  onDragEnd,
  hasConflict,
}: Props) {
  const router = useRouter();
  const isoTime =
    kind === "approved" ? article.scheduledAt : article.publishedAt;
  if (!isoTime) return null;

  const at = new Date(isoTime);
  const top = (minuteOfDay(at) / 60) * pxPerHour;
  const beingDragged = draggingId === article.id;

  return (
    <div
      data-block-id={article.id}
      className={cn(
        "absolute left-1 right-1 h-[56px] rounded-sm border-[1.5px] p-2",
        "flex items-start gap-2 bg-paper transition-shadow",
        kind === "approved"
          ? "border-accent shadow-[2px_2px_0_var(--color-accent)]"
          : "border-accent-2 shadow-[2px_2px_0_var(--color-accent-2)]",
        beingDragged && "opacity-40",
        hasConflict && "ring-2 ring-warn/70",
      )}
      style={{ top: `${top}px` }}
      draggable={kind === "approved"}
      onDragStart={(e) => {
        if (kind !== "approved" || !onDragStart) return;
        e.dataTransfer.setData("text/plain", article.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(article);
      }}
      onDragEnd={() => onDragEnd?.()}
      onDoubleClick={() => router.push(`/queue/${article.id}`)}
      role="button"
      tabIndex={0}
      title={`Double-click to open · ${hhmm(at)}`}
    >
      <span
        className={cn(
          "font-hand text-[11px] font-bold whitespace-nowrap shrink-0",
          kind === "approved" ? "text-accent" : "text-accent-2",
        )}
      >
        {hhmm(at)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-[13px] font-extrabold leading-tight line-clamp-1">
          {article.headline}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {category ? (
            <Pill variant="ghost">{category.name}</Pill>
          ) : null}
          {article.isBreaking ? <Pill variant="red">Breaking</Pill> : null}
          {kind === "published" ? (
            <span
              className="font-hand text-[10px] text-muted inline-flex items-center gap-1"
              title="Already published — drag locked"
            >
              <Lock size={10} /> live
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
