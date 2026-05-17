"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Btn } from "@/components/primitives/Btn";
import { addDays, sameDay } from "@/lib/utils/date";

interface Props {
  date: Date;
  onChange: (next: Date) => void;
  /** Optional label override for the centre chunk. */
  formatLabel?: (d: Date) => string;
}

const DAY_LABEL = (d: Date) =>
  d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** ←  {date}  →   ·  Today */
export function DateStepper({ date, onChange, formatLabel = DAY_LABEL }: Props) {
  const isToday = sameDay(date, new Date());

  return (
    <div className="flex items-center gap-2">
      <Btn
        size="icon"
        variant="ghost"
        onClick={() => onChange(addDays(date, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft size={14} />
      </Btn>
      <div className="font-serif text-[14px] font-extrabold tracking-[-0.01em] min-w-[210px] text-center">
        {formatLabel(date)}
      </div>
      <Btn
        size="icon"
        variant="ghost"
        onClick={() => onChange(addDays(date, 1))}
        aria-label="Next day"
      >
        <ChevronRight size={14} />
      </Btn>
      {!isToday ? (
        <Btn size="sm" variant="ghost" onClick={() => onChange(new Date())}>
          Today
        </Btn>
      ) : null}
    </div>
  );
}
