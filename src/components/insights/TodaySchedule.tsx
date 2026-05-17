"use client";

import { Clock } from "lucide-react";
import { Card, CardHead, CardTitle, CardMoreLink } from "@/components/primitives/Card";
import type { ArticleCardDTO } from "@/lib/types/article";

interface Props {
  /** Approved-with-scheduledAt articles in the next 24h. Empty until backend exposes status=approved. */
  scheduled: ArticleCardDTO[];
}

/**
 * Today's schedule strip. Phase 3 surfaces the visual but the data set is
 * almost always empty because the backend's `/articles/queue` only accepts
 * `submitted | under_review` — scheduled-publish lists land in admin Phase 5.
 */
export function TodaySchedule({ scheduled }: Props) {
  const hasData = scheduled.length > 0;

  return (
    <Card>
      <CardHead>
        <CardTitle>Today&apos;s schedule</CardTitle>
        <CardMoreLink href="/schedule">Plan →</CardMoreLink>
      </CardHead>

      {hasData ? (
        <ol className="flex flex-col gap-1.5">
          {scheduled.map((a) => {
            const at = a.scheduledAt
              ? new Date(a.scheduledAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";
            return (
              <li
                key={a.id}
                className="border-l-[3px] border-accent bg-paper border-[1.5px] rounded-sm pl-2.5 pr-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <Clock size={11} className="text-muted" />
                  <span className="font-hand text-[11px] text-muted">{at}</span>
                </div>
                <p className="font-serif text-[14px] font-bold leading-snug line-clamp-2 mt-0.5">
                  {a.headline}
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="border-[1.5px] border-dashed border-ink/30 rounded-sm bg-paper-2 px-3 py-3">
          <p className="font-hand text-[12px] text-ink">
            Nothing scheduled for today yet.
          </p>
          <p className="font-hand text-[11px] text-muted mt-1">
            Open the
            <a href="/schedule" className="text-accent mx-1 hover:underline">
              day planner
            </a>
            to drop an approved article on the timeline.
          </p>
        </div>
      )}
    </Card>
  );
}
