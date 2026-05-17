"use client";

import { Card, CardHead, CardTitle, CardMoreLink } from "@/components/primitives/Card";
import { cn } from "@/lib/utils/cn";

interface Props {
  /** Optional events grouped by ISO date `YYYY-MM-DD`. */
  eventsByDate?: Record<string, Array<{ id: string; label: string; tone?: "default" | "warn" | "ok" }>>;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TONE_BORDER: Record<NonNullable<NonNullable<Props["eventsByDate"]>[string][number]["tone"]>, string> = {
  default: "border-l-accent",
  warn: "border-l-warn",
  ok: "border-l-accent-2",
};

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay()); // Sunday-start
  return out;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function WeekStrip({ eventsByDate = {} }: Props) {
  const now = new Date();
  const start = startOfWeek(now);
  const todayIso = isoDate(now);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const hasAny = Object.keys(eventsByDate).length > 0;

  return (
    <Card>
      <CardHead>
        <CardTitle>This week</CardTitle>
        <CardMoreLink href="/calendar">Calendar →</CardMoreLink>
      </CardHead>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const iso = isoDate(d);
          const isToday = iso === todayIso;
          const events = eventsByDate[iso] ?? [];
          return (
            <div
              key={iso}
              className={cn(
                "rounded-sm border-[1.5px] p-2 min-h-[78px] flex flex-col gap-1",
                isToday ? "bg-ink text-paper border-ink" : "border-ink bg-paper",
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-hand text-[10px] tracking-[0.08em]">
                  {WEEKDAY[d.getDay()]}
                </span>
                <span className="font-serif text-[13px] font-extrabold">
                  {d.getDate()}
                </span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {events.slice(0, 3).map((e) => (
                  <li
                    key={e.id}
                    className={cn(
                      "font-hand text-[10.5px] leading-tight border-l-[2px] pl-1.5 truncate",
                      isToday ? "border-l-paper text-paper" : TONE_BORDER[e.tone ?? "default"],
                    )}
                  >
                    {e.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {!hasAny ? (
        <p className="font-hand text-[11px] text-muted">
          Week populates once
          <code className="font-mono text-[11px] mx-1 px-1 py-px bg-paper-2 rounded">
            /articles?status=approved
          </code>
          is exposed (admin Phase 5).
        </p>
      ) : null}
    </Card>
  );
}
