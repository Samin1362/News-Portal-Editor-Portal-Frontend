"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Printer, Plus } from "lucide-react";
import { Pill } from "@/components/primitives/Pill";
import { Btn } from "@/components/primitives/Btn";
import { CommissionStoryDialog } from "@/components/commission/CommissionStoryDialog";

interface ActionsRowProps {
  /** Format "HH:MM – HH:MM" — read from localStorage shift pref (default 09:00 – 18:00). */
  shift?: string;
}

const DEFAULT_SHIFT = "09:00 – 18:00";

export function ActionsRow({ shift = DEFAULT_SHIFT }: ActionsRowProps) {
  const router = useRouter();
  const [commissionOpen, setCommissionOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Pill variant="green" dot dotStatic>
          on shift · {shift}
        </Pill>
        <Btn
          variant="default"
          size="sm"
          onClick={() => router.push("/daily-plan")}
        >
          <Printer size={12} /> Daily plan
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => setCommissionOpen(true)}
        >
          <Plus size={12} /> Commission story
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => router.push("/calendar")}
        >
          <CalendarRange size={12} /> Open calendar
        </Btn>
      </div>
      <CommissionStoryDialog
        open={commissionOpen}
        onClose={() => setCommissionOpen(false)}
      />
    </>
  );
}
