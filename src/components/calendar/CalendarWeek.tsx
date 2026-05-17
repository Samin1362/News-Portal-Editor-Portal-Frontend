"use client";

import { cn } from "@/lib/utils/cn";
import { addDays, isoDay, sameDay, startOfWeek } from "@/lib/utils/date";
import type { CalendarEvent } from "./types";

interface Props {
  /** Date to anchor the week around (any day inside the desired week). */
  focus: Date;
  /** All events for the visible range, keyed by `isoDay`. */
  eventsByDay: Map<string, CalendarEvent[]>;
  onSelect: (event: CalendarEvent) => void;
  onSelectDay: (date: Date) => void;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 8;

export function CalendarWeek({
  focus,
  eventsByDay,
  onSelect,
  onSelectDay,
}: Props) {
  const start = startOfWeek(focus);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((d) => {
        const iso = isoDay(d);
        const isToday = sameDay(d, today);
        const isFocused = sameDay(d, focus);
        const events = eventsByDay.get(iso) ?? [];
        const visible = events.slice(0, MAX_VISIBLE);
        const overflow = events.length - visible.length;
        return (
          <div
            key={iso}
            className={cn(
              "rounded-sm border-[1.5px] p-2 min-h-[200px] flex flex-col gap-1.5",
              isToday
                ? "bg-ink text-paper border-ink"
                : isFocused
                  ? "border-accent bg-paper"
                  : "border-ink bg-paper",
            )}
          >
            <button
              type="button"
              className="flex items-baseline justify-between text-left hover:opacity-80"
              onClick={() => onSelectDay(d)}
            >
              <span className="font-hand text-[10px] tracking-[0.08em]">
                {WEEKDAY[d.getDay()]}
              </span>
              <span className="font-serif text-[14px] font-extrabold">
                {d.getDate()}
              </span>
            </button>
            <ul className="flex flex-col gap-0.5 grow">
              {visible.map((e) => (
                <li key={`${e.kind}-${e.id}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(e)}
                    title={`${formatTime(e.at)} · ${e.headline}`}
                    className={cn(
                      "w-full text-left font-hand text-[10.5px] leading-tight",
                      "border-l-[2px] pl-1.5 truncate hover:underline cursor-pointer",
                      isToday
                        ? "border-l-paper text-paper"
                        : e.kind === "approved"
                          ? "border-l-accent text-ink"
                          : "border-l-accent-2 text-ink",
                    )}
                  >
                    <span className="opacity-70 tabular-nums mr-1">
                      {formatTime(e.at)}
                    </span>
                    {e.headline}
                  </button>
                </li>
              ))}
            </ul>
            {overflow > 0 ? (
              <button
                type="button"
                onClick={() => onSelectDay(d)}
                className={cn(
                  "font-hand text-[10.5px] mt-0.5 text-left hover:underline",
                  isToday ? "text-paper" : "text-accent",
                )}
              >
                +{overflow} more
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
