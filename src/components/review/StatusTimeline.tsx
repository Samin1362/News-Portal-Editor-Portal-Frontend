"use client";

import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/utils/format";
import type { HistoryDTO } from "@/lib/types/article";

interface StatusTimelineProps {
  history: HistoryDTO[];
}

const ACTION_LABEL: Record<string, { label: string; tone: "default" | "warn" | "accent" | "ok" }> = {
  create: { label: "Drafted", tone: "default" },
  update: { label: "Edited", tone: "default" },
  submit: { label: "Submitted", tone: "default" },
  "start-review": { label: "Review started", tone: "accent" },
  approve: { label: "Approved", tone: "ok" },
  reject: { label: "Rejected", tone: "warn" },
  publish: { label: "Published", tone: "ok" },
  schedule: { label: "Scheduled", tone: "accent" },
  archive: { label: "Archived", tone: "default" },
  unarchive: { label: "Unarchived", tone: "default" },
  flags: { label: "Flags changed", tone: "default" },
};

const TONE_CLASS: Record<string, string> = {
  default: "bg-paper-2 border-ink/30",
  accent: "bg-accent/10 border-accent",
  warn: "bg-warn/15 border-warn",
  ok: "bg-accent-2/15 border-accent-2",
};

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="font-hand text-[12px] text-muted">No history recorded yet.</p>
    );
  }

  // Show most-recent-first
  const items = [...history].reverse();

  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((h, idx) => {
        const meta = ACTION_LABEL[h.action] ?? { label: h.action, tone: "default" };
        return (
          <li
            key={`${h.at}-${idx}`}
            className={cn(
              "flex items-center justify-between gap-2 border-[1.5px] rounded-[4px] px-2 py-1.5",
              TONE_CLASS[meta.tone],
            )}
          >
            <div className="min-w-0 flex-1">
              <span className="font-hand text-[11px] uppercase tracking-[0.08em]">
                {meta.label}
              </span>
              {h.note ? (
                <p className="font-sans text-[12px] text-ink mt-0.5 line-clamp-2">
                  {h.note}
                </p>
              ) : null}
            </div>
            <span className="font-hand text-[11px] text-muted shrink-0">
              {relativeTime(h.at)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
