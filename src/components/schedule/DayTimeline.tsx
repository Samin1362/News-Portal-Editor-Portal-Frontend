"use client";

import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { TimelineBlock } from "./TimelineBlock";
import { snapMinutes } from "@/lib/utils/date";
import type { ArticleCardDTO } from "@/lib/types/article";
import type { CategoryDTO } from "@/lib/types/category";

interface Props {
  approved: ArticleCardDTO[];
  published: ArticleCardDTO[];
  categoryMap: Map<string, CategoryDTO>;
  /** Same-day check (already filtered upstream — passed for "now" line). */
  isToday: boolean;
  /** Optional id-set of approved items that collide with another within 5 min. */
  conflicts: Set<string>;
  /**
   * Called when an approved block is dropped at a new minute-of-day. The
   * timeline does not call the API itself — the parent owns the mutation and
   * decides whether to roll back optimistically.
   */
  onReschedule: (articleId: string, minuteOfDay: number) => void;
  /** Current "now" minutes — drives the position of the time-cursor line. */
  nowMinute: number | null;
}

const PX_PER_HOUR = 56;
const TIMELINE_HEIGHT = PX_PER_HOUR * 24;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayTimeline({
  approved,
  published,
  categoryMap,
  isToday,
  conflicts,
  onReschedule,
  nowMinute,
}: Props) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverMinute, setHoverMinute] = useState<number | null>(null);

  const minuteFromEvent = (e: DragEvent<HTMLDivElement>): number => {
    const rect = gutterRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const y = e.clientY - rect.top;
    const raw = Math.max(0, Math.min(TIMELINE_HEIGHT, y));
    const minutes = (raw / PX_PER_HOUR) * 60;
    return snapMinutes(minutes, 5);
  };

  return (
    <div className="relative flex border-[1.5px] border-ink rounded-sm bg-paper overflow-hidden">
      {/* Hour labels gutter */}
      <div
        className="w-[60px] border-r-[1.5px] border-ink/15 bg-paper-2 relative"
        style={{ height: `${TIMELINE_HEIGHT}px` }}
      >
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-start justify-end pr-2 pt-0.5"
            style={{ top: `${h * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}
          >
            <span className="font-hand text-[11px] text-muted tabular-nums">
              {String(h).padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Event gutter */}
      <div
        ref={gutterRef}
        className="relative flex-1"
        style={{ height: `${TIMELINE_HEIGHT}px` }}
        onDragOver={(e) => {
          if (!draggingId) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setHoverMinute(minuteFromEvent(e));
        }}
        onDragLeave={() => setHoverMinute(null)}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain") || draggingId;
          if (!id) return;
          const minutes = minuteFromEvent(e);
          setHoverMinute(null);
          setDraggingId(null);
          onReschedule(id, minutes);
        }}
      >
        {/* Hour gridlines */}
        {HOURS.map((h) => (
          <div
            key={h}
            className={cn(
              "absolute left-0 right-0 border-t",
              h === 0 ? "border-transparent" : "border-ink/10",
            )}
            style={{ top: `${h * PX_PER_HOUR}px` }}
          />
        ))}

        {/* Now line */}
        {isToday && nowMinute != null ? (
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: `${(nowMinute / 60) * PX_PER_HOUR}px` }}
          >
            <div className="border-t-[1.5px] border-dashed border-accent" />
            <span className="absolute -top-[8px] right-1 font-hand text-[10px] text-accent bg-paper px-1">
              now
            </span>
          </div>
        ) : null}

        {/* Hover indicator while dragging */}
        {hoverMinute != null ? (
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 pointer-events-none z-20"
            style={{ top: `${(hoverMinute / 60) * PX_PER_HOUR}px` }}
          >
            <div className="border-t-[2px] border-ink" />
            <span className="absolute -top-[8px] left-1 font-hand text-[10px] bg-ink text-paper px-1 rounded-[2px]">
              {String(Math.floor(hoverMinute / 60)).padStart(2, "0")}:
              {String(hoverMinute % 60).padStart(2, "0")}
            </span>
          </div>
        ) : null}

        {/* Approved (draggable) blocks */}
        {approved.map((a) => (
          <TimelineBlock
            key={`a-${a.id}`}
            article={a}
            kind="approved"
            category={categoryMap.get(a.categoryId)}
            pxPerHour={PX_PER_HOUR}
            draggingId={draggingId}
            onDragStart={(art) => setDraggingId(art.id)}
            onDragEnd={() => {
              setDraggingId(null);
              setHoverMinute(null);
            }}
            hasConflict={conflicts.has(a.id)}
          />
        ))}

        {/* Published (locked) blocks */}
        {published.map((p) => (
          <TimelineBlock
            key={`p-${p.id}`}
            article={p}
            kind="published"
            category={categoryMap.get(p.categoryId)}
            pxPerHour={PX_PER_HOUR}
          />
        ))}

        {/* Empty-state when no blocks at all */}
        {approved.length === 0 && published.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 px-4 py-3">
              <p className="font-hand text-[12px] text-muted">
                Nothing scheduled or published for this day.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
