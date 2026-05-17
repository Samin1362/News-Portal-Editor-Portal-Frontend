"use client";

import { CalendarRange, Printer, Plus } from "lucide-react";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { useToast } from "@/lib/ui/toast";

interface ActionsRowProps {
  /** Format "HH:MM – HH:MM" — read from localStorage shift pref (default 09:00 – 18:00). */
  shift?: string;
}

const DEFAULT_SHIFT = "09:00 – 18:00";

export function ActionsRow({ shift = DEFAULT_SHIFT }: ActionsRowProps) {
  const toast = useToast();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Pill variant="green" dot dotStatic>
        on shift · {shift}
      </Pill>
      <Btn
        variant="default"
        size="sm"
        onClick={() => toast.info("Daily plan view lands in Phase 8 — print briefing")}
      >
        <Printer size={12} /> Daily plan
      </Btn>
      <Btn
        variant="primary"
        size="sm"
        onClick={() => toast.info("Commission flow lands in Phase 8")}
      >
        <Plus size={12} /> Commission story
      </Btn>
      <Btn
        variant="ghost"
        size="sm"
        onClick={() => toast.info("Editorial calendar lands in Phase 4")}
      >
        <CalendarRange size={12} /> Open calendar
      </Btn>
    </div>
  );
}
