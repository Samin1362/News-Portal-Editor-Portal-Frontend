"use client";

import { cn } from "@/lib/utils/cn";
import {
  addDays,
  isoDay,
  sameDay,
  startOfMonth,
  startOfWeek,
} from "@/lib/utils/date";
import type { CalendarEvent } from "./types";

interface Props {
  focus: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onSelect: (event: CalendarEvent) => void;
  onSelectDay: (date: Date) => void;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

export function CalendarMonth({
  focus,
  eventsByDay,
  onSelect,
  onSelectDay,
}: Props) {
  const monthStart = startOfMonth(focus);
  const gridStart = startOfWeek(monthStart);
  const month = focus.getMonth();
  const today = new Date();

  // Always render 6 weeks (42 cells) so the layout doesn't jitter.
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div className="rounded-sm border-[1.5px] border-ink bg-paper overflow-hidden">
      <div className="grid grid-cols-7 bg-paper-2 border-b-[1.5px] border-ink">
        {WEEKDAY.map((w) => (
          <div
            key={w}
            className="font-hand text-[10.5px] tracking-[0.08em] text-muted px-2 py-1.5 text-center"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const iso = isoDay(d);
          const inMonth = d.getMonth() === month;
          const isToday = sameDay(d, today);
          const isFocused = sameDay(d, focus);
          const events = eventsByDay.get(iso) ?? [];
          const visible = events.slice(0, MAX_VISIBLE);
          const overflow = events.length - visible.length;
          return (
            <div
              key={iso}
              className={cn(
                "border-r-[1px] border-b-[1px] border-ink/10 min-h-[88px] p-1.5 flex flex-col gap-1",
                !inMonth && "bg-paper-2/50",
                isFocused && "ring-1 ring-accent ring-inset",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(d)}
                className={cn(
                  "self-end font-serif text-[12.5px] font-extrabold leading-none",
                  "rounded-full px-1.5 py-0.5 hover:bg-ink/5",
                  isToday ? "bg-ink text-paper" : "text-ink",
                  !inMonth && "text-ink/40",
                )}
              >
                {d.getDate()}
              </button>
              <ul className="flex flex-col gap-0.5 grow">
                {visible.map((e) => (
                  <li key={`${e.kind}-${e.id}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(e)}
                      title={e.headline}
                      className={cn(
                        "w-full text-left font-hand text-[10.5px] leading-tight",
                        "border-l-[2px] pl-1 truncate hover:underline cursor-pointer",
                        e.kind === "approved"
                          ? "border-l-accent text-ink"
                          : "border-l-accent-2 text-ink",
                      )}
                    >
                      {e.headline}
                    </button>
                  </li>
                ))}
              </ul>
              {overflow > 0 ? (
                <button
                  type="button"
                  onClick={() => onSelectDay(d)}
                  className="font-hand text-[10px] text-accent hover:underline text-left"
                >
                  +{overflow} more
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
